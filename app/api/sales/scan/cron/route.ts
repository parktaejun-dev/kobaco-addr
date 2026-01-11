/**
 * Sales Scan Cron Endpoint
 * Processes one RSS feed per call for incremental scanning
 * Designed to be called by Vercel Cron every hour
 */

import { NextRequest, NextResponse } from 'next/server';
import pLimit from 'p-limit';
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

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const CRON_STATE_KEY = 'scan:cron:state';
const AI_CONCURRENCY = 3;
const ARTICLES_PER_RUN = 5;

interface CronState {
    feedIndex: number;
    lastRun: string;
    totalFeeds: number;
}

interface SalesConfig {
    naverClientId?: string;
    naverClientSecret?: string;
    keywords?: string[];
    rssFeeds?: RSSFeedConfig[];
    minScore?: number;
    leadNotificationsEnabled?: boolean;
    minLeadScoreForNotify?: number;
}

/**
 * GET /api/sales/scan/cron
 * Called by Vercel Cron - processes one source at a time
 * Index 0 = Naver News, Index 1+ = RSS Feeds
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const queryMinScore = searchParams.get('minScore');

        // Load config
        const config = await redis.get<SalesConfig>(RedisKeys.config());
        const feeds = config?.rssFeeds || [];

        // Naver counts as index 0, RSS feeds start from index 1
        const hasNaver = !!(config?.naverEnabled !== false && config?.naverClientId && config?.naverClientSecret && config?.keywords?.length);
        const totalSources = (hasNaver ? 1 : 0) + feeds.length;

        if (totalSources === 0) {
            return NextResponse.json({
                success: true,
                message: 'No feeds configured',
                leads: 0,
            });
        }

        // Get current cron state
        let state = await redis.get<CronState>(CRON_STATE_KEY);
        if (!state || state.feedIndex >= totalSources) {
            state = { feedIndex: 0, lastRun: new Date().toISOString(), totalFeeds: totalSources };
        }

        let allArticles: NormalizedArticle[] = [];
        let sourceName = '';

        // Index 0 = Naver (if configured), otherwise RSS[0]
        if (hasNaver && state.feedIndex === 0) {
            // Process Naver
            sourceName = '네이버 뉴스';
            console.log(`Cron: Processing ${state.feedIndex + 1}/${totalSources}: ${sourceName}`);

            const naverConfig: NaverConfig = {
                naverClientId: config!.naverClientId!,
                naverClientSecret: config!.naverClientSecret!,
                keywords: config!.keywords || [],
            };
            allArticles = await fetchNaverNews(naverConfig);
        } else {
            // Process RSS feed
            const rssIndex = hasNaver ? state.feedIndex - 1 : state.feedIndex;
            const currentFeed = feeds[rssIndex];
            sourceName = currentFeed?.category || `RSS ${rssIndex + 1}`;

            console.log(`Cron: Processing ${state.feedIndex + 1}/${totalSources}: ${sourceName}`);

            if (currentFeed) {
                allArticles = await fetchCustomFeeds([currentFeed], 10);
            }
        }

        const deduped = deduplicateArticles(allArticles);

        // Filter out already EXCLUDED or already processed
        const articlesToAnalyze: NormalizedArticle[] = [];
        for (const article of deduped.slice(0, ARTICLES_PER_RUN)) {
            const link = normalizeLink(article);
            const leadId = generateLeadId(link);
            const existingState = await redis.get<any>(RedisKeys.leadState(leadId));

            if (existingState?.status === 'EXCLUDED') {
                continue;
            }
            // Skip if already exists (to save AI calls)
            if (existingState) {
                continue;
            }
            articlesToAnalyze.push(article);
        }

        console.log(`Cron: ${allArticles.length} fetched, ${articlesToAnalyze.length} new to analyze`);

        const startTime = Date.now();
        const TIMEOUT_THRESHOLD = 45000; // 45 seconds

        // Analyze with AI
        const limiter = pLimit(AI_CONCURRENCY);
        const analyzePromises = articlesToAnalyze.map((article) =>
            limiter(async () => {
                // Check if we are running out of time
                if (Date.now() - startTime > TIMEOUT_THRESHOLD) {
                    console.warn('Cron: Approaching timeout, skipping remaining analysis');
                    return null;
                }

                let contentToAnalyze = article.contentSnippet;

                // For Newswire, fetch full content to get contact info
                if (article.link.includes('newswire.co.kr')) {
                    const fullContent = await fetchFullContent(article.link);
                    if (fullContent) {
                        contentToAnalyze = fullContent;
                    }
                }

                return analyzeArticle(article.title, contentToAnalyze, article._source);
            })
        );
        const analyses = await Promise.all(analyzePromises);

        // Build and save leads
        const leads: LeadCore[] = [];
        const minScore = queryMinScore ? Number(queryMinScore) : (config?.minScore ?? 50);

        for (let i = 0; i < articlesToAnalyze.length; i++) {
            const article = articlesToAnalyze[i];
            const analysis = analyses[i];

            if (!analysis) continue; // Skip skipped/failed analyses

            const hasKeyword = !!article._keyword;
            const recencyBonus = getRecencyBonus(article.pubDate);
            const sourceBonus = article._source === 'NAVER' ? 5 : 0;

            const finalScore = calculateFinalScore(
                analysis.ai_score,
                hasKeyword,
                recencyBonus,
                sourceBonus
            );

            if (finalScore < minScore) continue;

            const link = normalizeLink(article);
            const leadId = generateLeadId(link);

            const lead: LeadCore = {
                lead_id: leadId,
                title: article.title,
                link,
                contentSnippet: article.contentSnippet,
                pubDate: article.pubDate,
                source: sourceName,
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

        // Upsert leads
        const newLeadIds = await upsertLeads(leads);

        // 4. Send Notifications for NEW high-score leads
        if (newLeadIds.length > 0 && config?.leadNotificationsEnabled !== false) {
            const systemConfig = await getSystemConfig().catch(() => ({}));
            const notificationConfig = {
                slackUrl: systemConfig.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL,
                telegramToken: systemConfig.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN,
                telegramChatId: systemConfig.telegramChatId || process.env.TELEGRAM_CHAT_ID,
            };

            // Use user-defined threshold or default to 70
            const notifyThreshold = config?.minLeadScoreForNotify ?? 70;
            const leadsToNotify = leads.filter(l =>
                newLeadIds.includes(l.lead_id) && l.final_score >= notifyThreshold
            );

            for (const lead of leadsToNotify) {
                await sendLeadNotification({
                    title: lead.title,
                    company: lead.ai_analysis.company_name,
                    score: lead.final_score,
                    angle: lead.ai_analysis.sales_angle,
                    link: lead.link,
                    email: lead.contact?.email,
                    phone: lead.contact?.phone,
                }, notificationConfig);
            }
        }

        // Update cron state - move to next source
        const nextIndex = (state.feedIndex + 1) % totalSources;

        // Determine next source name for UX
        let nextSourceName = '';
        if (hasNaver && nextIndex === 0) {
            nextSourceName = '네이버 뉴스';
        } else {
            const nextRssIndex = hasNaver ? nextIndex - 1 : nextIndex;
            nextSourceName = feeds[nextRssIndex]?.category || `RSS ${nextRssIndex + 1}`;
        }

        await redis.set(CRON_STATE_KEY, {
            feedIndex: nextIndex,
            lastRun: new Date().toISOString(),
            totalFeeds: totalSources,
        });

        return NextResponse.json({
            success: true,
            source: sourceName,
            sourceIndex: state.feedIndex,
            nextSourceIndex: nextIndex,
            nextSourceName,
            totalSources,
            articlesFound: allArticles.length,
            newLeads: leads.length,
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
