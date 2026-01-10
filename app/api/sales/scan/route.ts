/**
 * Sales Scan API
 * Discovers and analyzes leads from RSS + Naver News
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
import { fetchCustomFeeds, type NormalizedArticle, type RSSFeedConfig } from '@/lib/rss-parser';
import { fetchNaverNews, type NaverConfig } from '@/lib/naver';
import { analyzeArticle } from '@/lib/ai-provider';

// Vercel serverless config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL = 300; // 5 minutes
const AI_CONCURRENCY = 3; // Max concurrent AI calls

interface SalesConfig {
  naverClientId?: string;
  naverClientSecret?: string;
  keywords?: string[];
  rssFeeds?: RSSFeedConfig[];
}

interface ScanResponse {
  success: boolean;
  cached: boolean;
  leads: LeadCore[];
  limit: number;
  minScore: number;
  stats?: {
    total_articles: number;
    analyzed: number;
    passed_filter: number;
  };
}

/**
 * POST /api/sales/scan
 * Query: { limit?: number, minScore?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '30'),
      100
    );
    const minScore = parseInt(searchParams.get('minScore') || '60');

    // Check cache first
    const cacheKey = RedisKeys.scanCache(limit, minScore);
    const cached = await redis.get<LeadCore[]>(cacheKey);

    if (cached && Array.isArray(cached)) {
      return NextResponse.json({
        success: true,
        cached: true,
        leads: cached,
        limit,
        minScore,
      } as ScanResponse);
    }

    // Load config from Redis
    const config = await redis.get<SalesConfig>(RedisKeys.config());

    // Fetch articles from RSS (custom or default)
    const rssArticles = await fetchCustomFeeds(config?.rssFeeds || [], 6);

    // Fetch articles from Naver if configured
    let naverArticles: NormalizedArticle[] = [];
    if (config?.naverClientId && config?.naverClientSecret) {
      const naverConfig: NaverConfig = {
        naverClientId: config.naverClientId,
        naverClientSecret: config.naverClientSecret,
        keywords: config.keywords || [],
      };
      naverArticles = await fetchNaverNews(naverConfig);
    }

    // Merge and deduplicate by canonical link
    const allArticles = [...rssArticles, ...naverArticles];
    const deduped = deduplicateArticles(allArticles);

    console.log(
      `Scan: ${allArticles.length} total, ${deduped.length} after dedup`
    );

    // Analyze with AI (with concurrency control)
    const limiter = pLimit(AI_CONCURRENCY);
    const analyzePromises = deduped.map((article) =>
      limiter(() =>
        analyzeArticle(article.title, article.contentSnippet, article._source)
      )
    );

    const analyses = await Promise.all(analyzePromises);

    // Build leads with scoring
    const leads: LeadCore[] = [];

    for (let i = 0; i < deduped.length; i++) {
      const article = deduped[i];
      const analysis = analyses[i];

      // Calculate final score
      const hasKeyword = !!article._keyword;
      const recencyBonus = getRecencyBonus(article.pubDate);
      const sourceBonus = article._source === 'NAVER' ? 5 : 0;

      const finalScore = calculateFinalScore(
        analysis.ai_score,
        hasKeyword,
        recencyBonus,
        sourceBonus
      );

      // Filter by minScore
      if (finalScore < minScore) {
        continue;
      }

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

    // Sort by final score descending
    leads.sort((a, b) => b.final_score - a.final_score);

    // Upsert to CRM (top N leads only to save Redis space)
    const leadsToUpsert = leads.slice(0, limit);
    await upsertLeads(leadsToUpsert);

    // Cache results
    await redis.set(cacheKey, leads, { ex: CACHE_TTL });

    return NextResponse.json({
      success: true,
      cached: false,
      leads: leads.slice(0, limit),
      limit,
      minScore,
      stats: {
        total_articles: allArticles.length,
        analyzed: deduped.length,
        passed_filter: leads.length,
      },
    } as ScanResponse);
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      {
        error: 'Scan failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Deduplicate articles by canonical link
 */
function deduplicateArticles(articles: NormalizedArticle[]): NormalizedArticle[] {
  const seen = new Set<string>();
  const result: NormalizedArticle[] = [];

  for (const article of articles) {
    const link = normalizeLink(article);
    if (!link || seen.has(link)) {
      continue;
    }
    seen.add(link);
    result.push(article);
  }

  return result;
}

/**
 * Upsert leads to CRM (Redis)
 */
async function upsertLeads(leads: LeadCore[]): Promise<void> {
  const pipeline = redis.pipeline();

  const timestamp = Date.now();

  for (const lead of leads) {
    const { lead_id } = lead;

    // Save LeadCore
    pipeline.set(RedisKeys.leadCore(lead_id), lead);

    // Check if LeadState exists
    const existingState = await redis.get<LeadState>(
      RedisKeys.leadState(lead_id)
    );

    // Init LeadState if missing
    if (!existingState) {
      const initialState = createInitialState(lead_id);
      pipeline.set(RedisKeys.leadState(lead_id), initialState);

      // Add to indices
      pipeline.zadd(RedisKeys.idxAll(), { score: timestamp, member: lead_id });
      pipeline.zadd(RedisKeys.idxStatus(LeadStatus.NEW), {
        score: timestamp,
        member: lead_id,
      });
    } else {
      // Update timestamp in existing indices
      pipeline.zadd(RedisKeys.idxAll(), { score: timestamp, member: lead_id });
      pipeline.zadd(RedisKeys.idxStatus(existingState.status), {
        score: timestamp,
        member: lead_id,
      });
    }
  }

  await pipeline.exec();
}
