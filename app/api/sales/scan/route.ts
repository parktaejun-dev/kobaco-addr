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
import { fetchCustomFeeds, fetchFullContent, type NormalizedArticle, type RSSFeedConfig } from '@/lib/rss-parser';
import { fetchNaverNews, type NaverConfig } from '@/lib/naver';
import { analyzeArticle } from '@/lib/ai-provider';
import { getSystemConfig } from '@/lib/content/kv';
import { sendLeadNotification } from '@/lib/notifications';

// Vercel serverless config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL = 300; // 5 minutes
const AI_CONCURRENCY = 3; // Max concurrent AI calls

interface SalesConfig {
  naverClientId?: string;
  naverClientSecret?: string;
  naverEnabled?: boolean;
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
    const activeFeeds = (config?.rssFeeds || []).filter(f => f.enabled !== false);
    const rssArticles = await fetchCustomFeeds(activeFeeds, 6);

    // Fetch articles from Naver if configured and enabled
    let naverArticles: NormalizedArticle[] = [];
    if (config?.naverEnabled !== false && config?.naverClientId && config?.naverClientSecret) {
      const naverConfig: NaverConfig = {
        naverClientId: config.naverClientId,
        naverClientSecret: config.naverClientSecret,
        keywords: config.keywords || [],
      };
      naverArticles = await fetchNaverNews(naverConfig);
    }

    // Merge and deduplicate by canonical link
    const allArticles = [...rssArticles, ...naverArticles];
    const dedupedAll = deduplicateArticles(allArticles);

    // Limit articles for AI analysis (Vercel 60s timeout)
    const MAX_ANALYZE = 15;
    const deduped = dedupedAll.slice(0, MAX_ANALYZE);

    console.log(
      `Scan: ${allArticles.length} total, ${dedupedAll.length} dedup, ${deduped.length} for AI`
    );

    // Filter out already EXCLUDED leads (skip re-analysis)
    const articlesToAnalyze: NormalizedArticle[] = [];
    for (const article of deduped) {
      const link = normalizeLink(article);
      const leadId = generateLeadId(link);
      const existingState = await redis.get<any>(RedisKeys.leadState(leadId));

      if (existingState?.status === 'EXCLUDED') {
        console.log(`Skipping EXCLUDED lead: ${leadId}`);
        continue;
      }
      articlesToAnalyze.push(article);
    }

    console.log(`After excluding: ${articlesToAnalyze.length} to analyze`);

    // Analyze with AI (with concurrency control)
    const limiter = pLimit(AI_CONCURRENCY);
    const analyzePromises = articlesToAnalyze.map((article) =>
      limiter(async () => {
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

    // Build leads with scoring
    const leads: LeadCore[] = [];

    for (let i = 0; i < articlesToAnalyze.length; i++) {
      const article = articlesToAnalyze[i];
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

    // Sort by final score descending
    leads.sort((a, b) => b.final_score - a.final_score);

    // Upsert to CRM (top N leads only to save Redis space)
    const leadsToUpsert = leads.slice(0, limit);
    const newLeadIds = await upsertLeads(leadsToUpsert);

    // 4. Send Notifications for NEW high-score leads
    if (newLeadIds.length > 0) {
      const systemConfig = await getSystemConfig().catch(() => ({}));
      const notificationConfig = {
        slackUrl: systemConfig.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL,
        telegramToken: systemConfig.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN,
        telegramChatId: systemConfig.telegramChatId || process.env.TELEGRAM_CHAT_ID,
      };

      // Only notify for leads with score >= 70 (or minScore if higher)
      const notifyThreshold = Math.max(70, minScore);
      const leadsToNotify = leadsToUpsert.filter(l =>
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
 * Returns array of IDs of NEWLY created leads
 */
async function upsertLeads(leads: LeadCore[]): Promise<string[]> {
  const pipeline = redis.pipeline();
  const timestamp = Date.now();
  const newLeadIds: string[] = [];

  for (const lead of leads) {
    const { lead_id } = lead;

    // Check if LeadState exists to identify if it's new
    const existingState = await redis.get<LeadState>(
      RedisKeys.leadState(lead_id)
    );

    // Save LeadCore
    pipeline.set(RedisKeys.leadCore(lead_id), lead);

    // Init LeadState if missing
    if (!existingState) {
      newLeadIds.push(lead_id);
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
  return newLeadIds;
}
