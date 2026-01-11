/**
 * Smart Sales Scan Cron Endpoint (Option A Enhanced)
 * - Round-Robin Fetching: Processes one RSS/Naver source per call
 * - Time-Budget Processing: Maximizes 60s Vercel limit with 50s budget
 * - Queue Priority: Skips fetch when queue is full, focuses on analysis
 * - 7-Day Company Blocking: Auto-filters excluded companies for 7 days
 * - Recursive Execution Support: Returns 'continue' signal for client
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
    RedisKeys,
    generateLeadId,
    normalizeLink,
    getRecencyBonus,
    calculateFinalScore,
    createInitialState,
    LeadStatus,
    type LeadCore,
    type LeadState,
} from '@/lib/crm-types';
import { fetchCustomFeeds, fetchDefaultFeeds, fetchFullContent, type NormalizedArticle, type RSSFeedConfig } from '@/lib/rss-parser';
import { fetchNaverNews, type NaverConfig } from '@/lib/naver';
import { analyzeArticle } from '@/lib/ai-provider';
import { getSystemConfig } from '@/lib/content/kv';
import { sendLeadNotification } from '@/lib/notifications';

export const maxDuration = 60; // Vercel Hobby Plan max
export const dynamic = 'force-dynamic';

const CRON_STATE_KEY = 'scan:cron:state';
const CRON_QUEUE_KEY = 'scan:cron:queue';
const CRON_PENDING_PREFIX = 'scan:cron:pending:';
const BLOCKED_COMPANIES_KEY = 'scan:blocked:companies'; // Sorted Set for 7-day blocking

// Configuration
const MAX_QUEUE_FOR_FETCH = 15;   // Skip fetch if queue has more than this
const TIMEOUT_THRESHOLD = 40000;  // 40s (20s safety margin for AI analysis)
const ENQUEUE_LIMIT = 30;         // Max articles to enqueue per fetch

interface CronState {
    feedIndex: number;
    lastRun: string;
    totalFeeds: number;
}

interface SalesConfig {
    naverClientId?: string;
    naverClientSecret?: string;
    naverEnabled?: boolean;
    keywords?: string[];
    rssFeeds?: RSSFeedConfig[];
    minScore?: number;
    leadNotificationsEnabled?: boolean;
    minLeadScoreForNotify?: number;
}

/**
 * GET /api/sales/scan/cron
 * Smart cron endpoint with queue priority and 7-day blocking
 * Index 0 = Naver News, Index 1+ = RSS Feeds
 */
export async function GET(req: NextRequest) {
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(req.url);
        const queryMinScore = searchParams.get('minScore');

        // Step 1: Clean up expired blocked companies (7-day TTL)
        await redis.zRemRangeByScore(BLOCKED_COMPANIES_KEY, '-inf', Date.now());

        // Load active blocked keywords
        const blockedKeywords = await redis.zrange(BLOCKED_COMPANIES_KEY, 0, -1);
        console.log(`Cron: ${blockedKeywords.length} companies blocked`);

        // Step 2: Check queue status
        let queueLength = await redis.llen(CRON_QUEUE_KEY);
        let allArticles: NormalizedArticle[] = [];
        let sourceName = 'Queue Processing';
        let fetchedCount = 0;
        let enqueuedCount = 0;

        // Step 3: Load config
        const config = await redis.get<SalesConfig>(RedisKeys.config());
        const feeds = config?.rssFeeds || [];
        const hasNaver = !!(config?.naverEnabled !== false && config?.naverClientId && config?.naverClientSecret && config?.keywords?.length);
        const totalSources = (hasNaver ? 1 : 0) + feeds.length;

        if (totalSources === 0) {
            return NextResponse.json({
                success: true,
                message: 'No feeds configured',
                queueLength,
                continue: queueLength > 0,
            });
        }

        // Step 4: Smart Fetch Strategy (skip if queue is busy)
        if (queueLength < MAX_QUEUE_FOR_FETCH) {
            let state = await redis.get<CronState>(CRON_STATE_KEY);
            if (!state || state.feedIndex >= totalSources) {
                state = { feedIndex: 0, lastRun: new Date().toISOString(), totalFeeds: totalSources };
            }

            // Fetch from current source (Round-Robin)
            if (hasNaver && state.feedIndex === 0) {
                sourceName = '네이버 뉴스';
                console.log(`Cron: Fetching ${sourceName}`);
                const naverConfig: NaverConfig = {
                    naverClientId: config!.naverClientId!,
                    naverClientSecret: config!.naverClientSecret!,
                    keywords: config!.keywords || [],
                };
                allArticles = await fetchNaverNews(naverConfig);
            } else {
                const rssIndex = hasNaver ? state.feedIndex - 1 : state.feedIndex;
                const currentFeed = feeds[rssIndex];
                sourceName = currentFeed?.category || `RSS ${rssIndex + 1}`;
                console.log(`Cron: Fetching ${sourceName}`);
                if (currentFeed) {
                    allArticles = await fetchCustomFeeds([currentFeed], 10);
                }
            }

            fetchedCount = allArticles.length;
            const deduped = deduplicateArticles(allArticles);

            // Enqueue with keyword blocking
            for (const article of deduped.slice(0, ENQUEUE_LIMIT)) {
                const link = normalizeLink(article);
                if (!link) continue;

                // Check if blocked by company keyword
                const isBlocked = blockedKeywords.some(keyword =>
                    article.title.includes(keyword) ||
                    (article.contentSnippet && article.contentSnippet.includes(keyword))
                );
                if (isBlocked) {
                    continue; // Skip without AI analysis
                }

                const leadId = generateLeadId(link);
                const existingState = await redis.get<any>(RedisKeys.leadState(leadId));
                if (existingState) continue;

                const pendingKey = `${CRON_PENDING_PREFIX}${leadId}`;
                const pending = await redis.get(pendingKey);
                if (pending) continue;

                await redis.lPush(CRON_QUEUE_KEY, JSON.stringify({ article, sourceName }));
                await redis.set(pendingKey, Date.now(), { ex: 60 * 60 * 24 });
                enqueuedCount += 1;
            }

            // Update state to next source (Round-Robin)
            const nextIndex = (state.feedIndex + 1) % totalSources;
            await redis.set(CRON_STATE_KEY, {
                feedIndex: nextIndex,
                lastRun: new Date().toISOString(),
                totalFeeds: totalSources,
            });

            queueLength = await redis.llen(CRON_QUEUE_KEY);
            console.log(`Cron: ${fetchedCount} fetched, ${enqueuedCount} enqueued, queue=${queueLength}`);
        } else {
            console.log(`Cron: Queue busy (${queueLength} items). Skipping fetch, focusing on analysis.`);
        }

        // Step 5: Time-Budget Processing (process as many as possible in 50s)
        const leads: LeadCore[] = [];
        const minScore = queryMinScore ? Number(queryMinScore) : (config?.minScore ?? 50);
        let processedCount = 0;

        while (true) {
            // Timeout check
            if (Date.now() - startTime > TIMEOUT_THRESHOLD) {
                console.warn(`Cron: Time budget exhausted (${processedCount} processed). Stopping.`);
                break;
            }

            // Pop one item from queue
            const rawItems = await redis.lPop(CRON_QUEUE_KEY);
            if (!rawItems || rawItems.length === 0) break; // Queue empty

            const rawItem = rawItems[0]; // Get first item from array
            processedCount++;

            try {
                let payload: { article: NormalizedArticle; sourceName?: string };
                if (typeof rawItem === 'string') {
                    payload = JSON.parse(rawItem);
                } else {
                    continue;
                }

                const { article, sourceName: itemSource } = payload;
                const sourceLabel = itemSource || article._category || article._source;

                // Double-check blocking (in case company was blocked while in queue)
                const isBlocked = blockedKeywords.some(keyword =>
                    article.title.includes(keyword) ||
                    (article.contentSnippet && article.contentSnippet.includes(keyword))
                );
                if (isBlocked) continue;

                const link = normalizeLink(article);
                if (!link) continue;

                const leadId = generateLeadId(link);
                const existingState = await redis.get<any>(RedisKeys.leadState(leadId));
                if (existingState) continue;

                // Check time before expensive AI analysis
                if (Date.now() - startTime > TIMEOUT_THRESHOLD) {
                    console.warn(`Cron: Time budget exhausted before AI analysis. Re-queueing.`);
                    await redis.rPush(CRON_QUEUE_KEY, rawItem);
                    break;
                }

                // AI Analysis
                let contentToAnalyze = article.contentSnippet;
                if (article.link.includes('newswire.co.kr')) {
                    const full = await fetchFullContent(article.link);
                    if (full) contentToAnalyze = full;
                }

                const analysis = await analyzeArticle(article.title, contentToAnalyze, article._source);

                // Scoring
                const hasKeyword = !!article._keyword;
                const recencyBonus = getRecencyBonus(article.pubDate);
                const sourceBonus = article._source === 'NAVER' ? 5 : 0;
                const finalScore = calculateFinalScore(
                    analysis.ai_score,
                    hasKeyword,
                    recencyBonus,
                    sourceBonus
                );

                if (finalScore >= minScore) {
                    const lead: LeadCore = {
                        lead_id: leadId,
                        title: article.title,
                        link,
                        contentSnippet: article.contentSnippet,
                        pubDate: article.pubDate,
                        source: sourceLabel,
                        keyword: article._keyword,
                        ai_analysis: analysis,
                        contact: {
                            email: analysis.contact_email || undefined,
                            phone: analysis.contact_phone || undefined,
                            pr_agency: analysis.pr_agency || undefined,
                            homepage: analysis.homepage_url || undefined,
                            source: article._source === 'NAVER' ? 'NEWS' : 'NEWS',
                        },
                        final_score: finalScore,
                        created_at: Date.now(),
                        updated_at: Date.now(),
                    };
                    leads.push(lead);
                }
            } catch (error) {
                console.error('Item processing error, re-queueing:', error);
                await redis.rPush(CRON_QUEUE_KEY, rawItem);
            }
        }

        // Step 6: Batch save leads
        const newLeadIds = leads.length > 0 ? await upsertLeads(leads) : [];

        // Step 7: Send notifications
        if (newLeadIds.length > 0 && config?.leadNotificationsEnabled !== false) {
            const systemConfig = await getSystemConfig().catch(() => ({}));
            const notificationConfig = {
                slackUrl: systemConfig.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL,
                telegramToken: systemConfig.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN,
                telegramChatId: systemConfig.telegramChatId || process.env.TELEGRAM_CHAT_ID,
            };

            const notifyThreshold = config?.minLeadScoreForNotify ?? 70;
            const leadsToNotify = leads.filter(l =>
                newLeadIds.includes(l.lead_id) && l.final_score >= notifyThreshold
            );

            await Promise.all(leadsToNotify.map(lead =>
                sendLeadNotification({
                    title: lead.title,
                    company: lead.ai_analysis.company_name,
                    score: lead.final_score,
                    angle: lead.ai_analysis.sales_angle,
                    link: lead.link,
                    email: lead.contact?.email,
                    phone: lead.contact?.phone,
                }, notificationConfig)
            ));
        }

        const remainingQueue = await redis.llen(CRON_QUEUE_KEY);
        const elapsedTime = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            source: sourceName,
            fetched: fetchedCount,
            enqueued: enqueuedCount,
            processed: processedCount,
            newLeads: newLeadIds.length,
            queueLength: remainingQueue,
            continue: remainingQueue > 0, // Signal for recursive execution
            blockedKeywords: blockedKeywords.length,
            elapsedMs: elapsedTime,
        });
    } catch (error) {
        console.error('Cron scan error:', error);
        return NextResponse.json(
            { error: 'Cron scan failed', message: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

function deduplicateArticles(articles: NormalizedArticle[]): NormalizedArticle[] {
    const seen = new Set<string>();
    return articles.filter((article) => {
        const link = normalizeLink(article);
        if (!link || seen.has(link)) return false;
        seen.add(link);
        return true;
    });
}

/**
 * Upsert leads to CRM (Redis)
 * Returns array of IDs of NEWLY created leads
 */
async function upsertLeads(leads: LeadCore[]): Promise<string[]> {
    const timestamp = Date.now();
    const newLeadIds: string[] = [];

    for (const lead of leads) {
        const { lead_id } = lead;

        const existingState = await redis.get<LeadState>(RedisKeys.leadState(lead_id));

        await redis.set(RedisKeys.leadCore(lead_id), lead);

        if (!existingState) {
            newLeadIds.push(lead_id);
            const initialState = createInitialState(lead_id);
            await redis.set(RedisKeys.leadState(lead_id), initialState);
            await redis.zadd(RedisKeys.idxAll(), { score: timestamp, member: lead_id });
            await redis.zadd(RedisKeys.idxStatus(LeadStatus.NEW), { score: timestamp, member: lead_id });
        } else {
            await redis.zadd(RedisKeys.idxAll(), { score: timestamp, member: lead_id });
            await redis.zadd(RedisKeys.idxStatus(existingState.status), { score: timestamp, member: lead_id });
        }
    }
    return newLeadIds;
}
