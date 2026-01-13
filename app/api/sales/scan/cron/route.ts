/**
 * Sales Scan Cron Endpoint
 * Processes one RSS feed per call for incremental scanning
 * Designed to be called by Vercel Cron every hour
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
    type AIAnalysis,
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
const CRON_QUEUE_KEY = 'scan:cron:queue';
const CRON_PENDING_PREFIX = 'scan:cron:pending:';
const ENQUEUE_LIMIT = 20;
const ANALYZE_PER_RUN = 2;
const TIMEOUT_THRESHOLD = 45000; // 45 seconds

interface CronState {
    feedIndex: number;
    lastRun: string;
    totalFeeds: number;
}

interface SalesConfig {
    naverClientId?: string;
    naverClientSecret?: string;
    naverEnabled?: boolean;
    naverDaysWindow?: number;
    rssDaysWindow?: number;
    keywords?: string[];
    rssFeeds?: RSSFeedConfig[];
    minScore?: number;
    leadNotificationsEnabled?: boolean;
    minLeadScoreForNotify?: number;
    excludedCompanies?: string[];
    excludedCompaniesTemporary?: Array<{ name: string; expiresAt: number }>;
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
        const daysParam = searchParams.get('days');
        const parsedDays = daysParam ? parseInt(daysParam) : null;
        const queryDaysWindow = Number.isFinite(parsedDays) ? Math.max(1, parsedDays as number) : null;

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
            const naverDaysWindow = config?.naverDaysWindow ?? 3;
            allArticles = await fetchNaverNews(naverConfig, { daysWindow: naverDaysWindow });
        } else {
            // Process RSS feed
            const rssIndex = hasNaver ? state.feedIndex - 1 : state.feedIndex;
            const currentFeed = feeds[rssIndex];
            sourceName = currentFeed?.category || `RSS ${rssIndex + 1}`;

            console.log(`Cron: Processing ${state.feedIndex + 1}/${totalSources}: ${sourceName}`);

            if (currentFeed) {
                allArticles = await fetchCustomFeeds([currentFeed], 0);
            }
        }

        const deduped = deduplicateArticles(allArticles);
        const rssDaysWindow = queryDaysWindow ?? (config?.rssDaysWindow ?? 7);
        const recentArticles = filterRecentArticles(deduped, rssDaysWindow);

        // Enqueue new articles (avoid re-analysis within a short window)
        let enqueued = 0;
        for (const article of recentArticles.slice(0, ENQUEUE_LIMIT)) {
            const link = normalizeLink(article);
            if (!link) continue;

            const leadId = generateLeadId(link);
            const existingState = await redis.get<any>(RedisKeys.leadState(leadId));
            if (existingState?.status === 'EXCLUDED' || existingState) {
                continue;
            }

            const pendingKey = `${CRON_PENDING_PREFIX}${leadId}`;
            const pending = await redis.get(pendingKey);
            if (pending) {
                continue;
            }

            await redis.lPush(CRON_QUEUE_KEY, JSON.stringify({ article, sourceName }));
            await redis.set(pendingKey, Date.now(), { ex: 60 * 60 * 24 });
            enqueued += 1;
        }

        console.log(`Cron: ${allArticles.length} fetched, ${enqueued} enqueued`);

        const startTime = Date.now();

        const queuedItems = await redis.lPop(CRON_QUEUE_KEY, ANALYZE_PER_RUN);
        const itemsToAnalyze = queuedItems || [];

        const analyzedArticles: Array<{
            article: NormalizedArticle;
            analysis: AIAnalysis;
            sourceLabel: string;
            leadId: string;
        }> = [];

        // Build and save leads
        const leads: LeadCore[] = [];
        const minScore = queryMinScore ? Number(queryMinScore) : (config?.minScore ?? 50);

        for (const rawItem of itemsToAnalyze) {
            if (Date.now() - startTime > TIMEOUT_THRESHOLD) {
                console.warn('Cron: Approaching timeout, re-queueing remaining items');
                await redis.rPush(CRON_QUEUE_KEY, rawItem);
                break;
            }

            let payload: { article: NormalizedArticle; sourceName?: string };
            try {
                payload = JSON.parse(rawItem) as { article: NormalizedArticle; sourceName?: string };
            } catch {
                continue;
            }

            const article = payload.article;
            const sourceLabel = payload.sourceName || article._category || article._source;

            const link = normalizeLink(article);
            if (!link) continue;

            const leadId = generateLeadId(link);
            const existingState = await redis.get<any>(RedisKeys.leadState(leadId));
            if (existingState) {
                continue;
            }

            let analysis;
            try {
                let contentToAnalyze = article.contentSnippet;

                // For Newswire, fetch full content to get contact info
                if (article.link.includes('newswire.co.kr')) {
                    const fullContent = await fetchFullContent(article.link);
                    if (fullContent) {
                        contentToAnalyze = fullContent;
                    }
                }

                analysis = await analyzeArticle(article.title, contentToAnalyze, article._source);
            } catch (error) {
                console.warn('Cron: Failed to analyze, re-queueing', error);
                await redis.rPush(CRON_QUEUE_KEY, rawItem);
                continue;
            }

            analyzedArticles.push({ article, analysis, sourceLabel, leadId });
        }

        const excludedCompanyKeys = buildExcludedCompanySet(config || undefined);
        const filteredByExclusions = filterExcludedCompanies(
            analyzedArticles,
            excludedCompanyKeys
        );
        const dedupedByCompany = deduplicateByCompany(filteredByExclusions);

        for (const item of dedupedByCompany) {
            const { article, analysis, sourceLabel, leadId } = item;
            const recencyBonus = getRecencyBonus(article.pubDate);
            const sourceBonus = article._source === 'NAVER' ? 5 : 0;

            const finalScore = calculateFinalScore(
                analysis.ai_score,
                recencyBonus,
                sourceBonus
            );

            if (finalScore < minScore) continue;

            const lead: LeadCore = {
                lead_id: leadId,
                title: article.title,
                link: normalizeLink(article),
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

        const queueLength = await redis.llen(CRON_QUEUE_KEY);

        return NextResponse.json({
            success: true,
            source: sourceName,
            sourceIndex: state.feedIndex,
            nextSourceIndex: nextIndex,
            nextSourceName,
            totalSources,
            articlesFound: allArticles.length,
            enqueued,
            processed: leads.length,
            queueLength,
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

function filterRecentArticles(
    articles: NormalizedArticle[],
    daysWindow: number
): NormalizedArticle[] {
    const cutoffMs = Date.now() - daysWindow * 24 * 60 * 60 * 1000;
    return articles.filter((article) => {
        const ts = Date.parse(article.pubDate);
        return !Number.isNaN(ts) && ts >= cutoffMs;
    });
}

type AnalyzedArticle = {
    article: NormalizedArticle;
    analysis: AIAnalysis;
    sourceLabel: string;
    leadId: string;
};

function normalizeCompanyKey(name: string): string {
    return name.trim().toLowerCase();
}

function getPubDateMs(pubDate: string): number {
    const ts = Date.parse(pubDate);
    return Number.isNaN(ts) ? 0 : ts;
}

function buildExcludedCompanySet(config?: SalesConfig): Set<string> {
    const keys = new Set<string>();

    for (const company of config?.excludedCompanies || []) {
        const key = normalizeCompanyKey(company);
        if (key) keys.add(key);
    }

    const now = Date.now();
    for (const item of config?.excludedCompaniesTemporary || []) {
        if (!item || item.expiresAt <= now) continue;
        const key = normalizeCompanyKey(item.name || '');
        if (key) keys.add(key);
    }

    return keys;
}

function filterExcludedCompanies(
    articles: AnalyzedArticle[],
    excludedCompanies: Set<string>
): AnalyzedArticle[] {
    if (excludedCompanies.size === 0) return articles;

    return articles.filter((item) => {
        const company = item.analysis.company_name?.trim();
        if (!company) return true;
        return !excludedCompanies.has(normalizeCompanyKey(company));
    });
}

/**
 * Keep only the newest article per company name.
 */
function deduplicateByCompany(articles: AnalyzedArticle[]): AnalyzedArticle[] {
    const byCompany = new Map<string, AnalyzedArticle>();
    const withoutCompany: AnalyzedArticle[] = [];

    for (const item of articles) {
        const company = item.analysis.company_name?.trim();
        if (!company) {
            withoutCompany.push(item);
            continue;
        }

        const key = company.toLowerCase();
        const existing = byCompany.get(key);
        if (!existing) {
            byCompany.set(key, item);
            continue;
        }

        const currentTime = getPubDateMs(item.article.pubDate);
        const existingTime = getPubDateMs(existing.article.pubDate);
        if (currentTime > existingTime) {
            byCompany.set(key, item);
        } else if (
            currentTime === existingTime &&
            item.analysis.ai_score > existing.analysis.ai_score
        ) {
            byCompany.set(key, item);
        }
    }

    return [...byCompany.values(), ...withoutCompany];
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
