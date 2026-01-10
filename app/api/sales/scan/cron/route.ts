/**
 * Sales Scan Cron Endpoint
 * Processes one RSS feed per call for incremental scanning
 * Designed to be called by Vercel Cron every hour
 */

import { NextResponse } from 'next/server';
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
import { fetchCustomFeeds, fetchDefaultFeeds, type NormalizedArticle, type RSSFeedConfig } from '@/lib/rss-parser';
import { fetchNaverNews, type NaverConfig } from '@/lib/naver';
import { analyzeArticle } from '@/lib/ai-provider';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const CRON_STATE_KEY = 'scan:cron:state';
const AI_CONCURRENCY = 3;
const ARTICLES_PER_RUN = 10;

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
}

/**
 * GET /api/sales/scan/cron
 * Called by Vercel Cron - processes one feed at a time
 */
export async function GET() {
    try {
        // Load config
        const config = await redis.get<SalesConfig>(RedisKeys.config());
        const feeds = config?.rssFeeds || [];

        if (feeds.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No feeds configured',
                leads: 0,
            });
        }

        // Get current cron state
        let state = await redis.get<CronState>(CRON_STATE_KEY);
        if (!state || state.feedIndex >= feeds.length) {
            state = { feedIndex: 0, lastRun: new Date().toISOString(), totalFeeds: feeds.length };
        }

        const currentFeed = feeds[state.feedIndex];
        console.log(`Cron: Processing feed ${state.feedIndex + 1}/${feeds.length}: ${currentFeed.category}`);

        // Fetch articles from current feed only
        const rssArticles = await fetchCustomFeeds([currentFeed], 10);

        // Also fetch Naver if configured and this is the first feed
        let naverArticles: NormalizedArticle[] = [];
        if (state.feedIndex === 0 && config?.naverClientId && config?.naverClientSecret) {
            const naverConfig: NaverConfig = {
                naverClientId: config.naverClientId,
                naverClientSecret: config.naverClientSecret,
                keywords: config.keywords || [],
            };
            naverArticles = await fetchNaverNews(naverConfig);
        }

        // Combine and deduplicate
        const allArticles = [...rssArticles, ...naverArticles];
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

        // Analyze with AI
        const limiter = pLimit(AI_CONCURRENCY);
        const analyzePromises = articlesToAnalyze.map((article) =>
            limiter(() => analyzeArticle(article.title, article.contentSnippet, article._source))
        );
        const analyses = await Promise.all(analyzePromises);

        // Build and save leads
        const leads: LeadCore[] = [];
        const minScore = 50; // Lower threshold for cron

        for (let i = 0; i < articlesToAnalyze.length; i++) {
            const article = articlesToAnalyze[i];
            const analysis = analyses[i];

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
                source: article._source,
                keyword: article._keyword,
                ai_analysis: analysis,
                final_score: finalScore,
                created_at: Date.now(),
                updated_at: Date.now(),
            };

            leads.push(lead);
        }

        // Upsert leads
        await upsertLeads(leads);

        // Update cron state - move to next feed
        const nextIndex = (state.feedIndex + 1) % feeds.length;
        await redis.set(CRON_STATE_KEY, {
            feedIndex: nextIndex,
            lastRun: new Date().toISOString(),
            totalFeeds: feeds.length,
        });

        return NextResponse.json({
            success: true,
            feed: currentFeed.category,
            feedIndex: state.feedIndex,
            nextFeedIndex: nextIndex,
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

async function upsertLeads(leads: LeadCore[]): Promise<void> {
    const timestamp = Date.now();

    for (const lead of leads) {
        const { lead_id } = lead;

        await redis.set(RedisKeys.leadCore(lead_id), lead);

        const existingState = await redis.get<LeadState>(RedisKeys.leadState(lead_id));

        if (!existingState) {
            const initialState = createInitialState(lead_id);
            await redis.set(RedisKeys.leadState(lead_id), initialState);
            await redis.zadd(RedisKeys.idxAll(), { score: timestamp, member: lead_id });
            await redis.zadd(RedisKeys.idxStatus(LeadStatus.NEW), { score: timestamp, member: lead_id });
        } else {
            await redis.zadd(RedisKeys.idxAll(), { score: timestamp, member: lead_id });
            await redis.zadd(RedisKeys.idxStatus(existingState.status), { score: timestamp, member: lead_id });
        }
    }
}
