/**
 * Sales Scan API
 * Discovers and analyzes leads from RSS + Naver News
 */

import { randomUUID } from 'crypto';
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
  type AIAnalysis,
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
const SCAN_TTL = 60 * 60; // 1 hour
const TIMEOUT_THRESHOLD = 45000; // 45 seconds
const DEFAULT_BATCH_SIZE = 10;

interface SalesConfig {
  naverClientId?: string;
  naverClientSecret?: string;
  naverEnabled?: boolean;
  naverDaysWindow?: number;
  rssDaysWindow?: number;
  keywords?: string[];
  rssFeeds?: RSSFeedConfig[];
  leadNotificationsEnabled?: boolean;
  minLeadScoreForNotify?: number;
  excludedCompanies?: string[];
  excludedCompaniesTemporary?: Array<{ name: string; expiresAt: number }>;
}

interface ScanResponse {
  success: boolean;
  cached: boolean;
  leads: LeadCore[];
  limit: number;
  minScore: number;
  cursor?: string | null;
  done?: boolean;
  stats?: {
    total_articles: number;
    analyzed: number;
    passed_filter: number;
    remaining?: number;
  };
}

/**
 * POST /api/sales/scan
 * Query: { limit?: number, minScore?: number, cursor?: string, batchSize?: number, feedLimit?: number, days?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '30'),
      100
    );
    const minScore = parseInt(searchParams.get('minScore') || '60');
    const cursor = searchParams.get('cursor');
    const batchSize = Math.min(
      Math.max(parseInt(searchParams.get('batchSize') || `${DEFAULT_BATCH_SIZE}`), 1),
      50
    );
    const feedLimitParam = searchParams.get('feedLimit');
    const parsedFeedLimit = feedLimitParam ? parseInt(feedLimitParam) : 0;
    const feedLimit = Number.isFinite(parsedFeedLimit) ? Math.max(0, parsedFeedLimit) : 0;
    const daysParam = searchParams.get('days');
    const parsedDays = daysParam ? parseInt(daysParam) : null;
    const queryDaysWindow = Number.isFinite(parsedDays) ? Math.max(1, parsedDays as number) : null;

    if (!cursor) {
      // Check cache first (only for single-shot scans)
      const cacheKey = RedisKeys.scanCache(limit, minScore);
      const cached = await redis.get<LeadCore[]>(cacheKey);

      if (cached && Array.isArray(cached)) {
        return NextResponse.json({
          success: true,
          cached: true,
          leads: cached,
          limit,
          minScore,
          cursor: null,
          done: true,
        } as ScanResponse);
      }
    }

    // Load config from Redis
    const config = await redis.get<SalesConfig>(RedisKeys.config());

    const scanToken = cursor || randomUUID();
    const listKey = RedisKeys.scanList(scanToken);
    const metaKey = RedisKeys.scanMeta(scanToken);

    let totalArticles = 0;
    let dedupedCount = 0;

    if (!cursor) {
      // Fetch articles from RSS (custom or default)
      const activeFeeds = (config?.rssFeeds || []).filter(f => f.enabled !== false);
      const rssArticles = await fetchCustomFeeds(activeFeeds, feedLimit);

      // Fetch articles from Naver if configured and enabled
      let naverArticles: NormalizedArticle[] = [];
      if (config?.naverEnabled !== false && config?.naverClientId && config?.naverClientSecret) {
        const naverConfig: NaverConfig = {
          naverClientId: config.naverClientId,
          naverClientSecret: config.naverClientSecret,
          keywords: config.keywords || [],
        };
        const naverDaysWindow = config.naverDaysWindow ?? 3;
        naverArticles = await fetchNaverNews(naverConfig, { daysWindow: naverDaysWindow });
      }

      // Merge and deduplicate by canonical link
      const allArticles = [...rssArticles, ...naverArticles];
      const dedupedAll = deduplicateArticles(allArticles);
      const rssDaysWindow = queryDaysWindow ?? (config?.rssDaysWindow ?? 7);
      const recentAll = filterRecentArticles(dedupedAll, rssDaysWindow);

      // Analyze all deduped articles unless a limit is explicitly provided
      const analyzeLimitParam = searchParams.get('analyzeLimit');
      const analyzeLimit = analyzeLimitParam ? Math.max(0, parseInt(analyzeLimitParam)) : recentAll.length;
      const deduped = analyzeLimit > 0 ? recentAll.slice(0, analyzeLimit) : recentAll;

      totalArticles = recentAll.length;
      dedupedCount = recentAll.length;

      console.log(
        `Scan: ${allArticles.length} total, ${dedupedAll.length} dedup, ${recentAll.length} within ${rssDaysWindow}d, ${deduped.length} for AI`
      );

      for (const article of deduped) {
        await redis.rPush(listKey, JSON.stringify(article));
      }
      await redis.expire(listKey, SCAN_TTL);
      await redis.set(metaKey, {
        total_articles: totalArticles,
        deduped: dedupedCount,
        created_at: new Date().toISOString(),
      }, { ex: SCAN_TTL });
    }

    const meta = await redis.get<{ total_articles: number; deduped: number }>(metaKey);
    if (meta) {
      totalArticles = meta.total_articles;
      dedupedCount = meta.deduped;
    }

    const rawItems = (await redis.lPop(listKey, batchSize)) || [];
    if (rawItems.length === 0) {
      await redis.del(listKey);
      await redis.del(metaKey);
      return NextResponse.json({
        success: true,
        cached: false,
        leads: [],
        limit,
        minScore,
        cursor: null,
        done: true,
        stats: {
          total_articles: totalArticles,
          analyzed: 0,
          passed_filter: 0,
          remaining: 0,
        },
      } as ScanResponse);
    }

    const startTime = Date.now();
    const deferredRaw: string[] = [];
    const articlesToAnalyze: NormalizedArticle[] = [];

    for (const rawItem of rawItems) {
      if (Date.now() - startTime > TIMEOUT_THRESHOLD) {
        deferredRaw.push(rawItem);
        continue;
      }

      let article: NormalizedArticle | null = null;
      try {
        article = JSON.parse(rawItem) as NormalizedArticle;
      } catch {
        continue;
      }

      const link = normalizeLink(article);
      const leadId = generateLeadId(link);
      const existingState = await redis.get<any>(RedisKeys.leadState(leadId));

      if (existingState?.status === 'EXCLUDED') {
        console.log(`Skipping EXCLUDED lead: ${leadId}`);
        continue;
      }

      articlesToAnalyze.push(article);
    }

    for (const rawItem of deferredRaw) {
      await redis.rPush(listKey, rawItem);
    }

    console.log(`Batch: ${articlesToAnalyze.length} to analyze (cursor=${scanToken})`);

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
    const excludedCompanyKeys = buildExcludedCompanySet(config || undefined);

    const analyzedArticles = articlesToAnalyze.map((article, index) => ({
      article,
      analysis: analyses[index],
    }));
    const filteredByExclusions = filterExcludedCompanies(
      analyzedArticles,
      excludedCompanyKeys
    );
    const dedupedByCompany = deduplicateByCompany(filteredByExclusions);

    // Build leads with scoring
    const leads: LeadCore[] = [];

    for (const { article, analysis } of dedupedByCompany) {

      // Calculate final score
      const recencyBonus = getRecencyBonus(article.pubDate);
      const sourceBonus = article._source === 'NAVER' ? 5 : 0;

      const finalScore = calculateFinalScore(
        analysis.ai_score,
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
        source: article._category || article._source,
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
    if (newLeadIds.length > 0 && config?.leadNotificationsEnabled !== false) {
      const systemConfig = await getSystemConfig().catch(() => ({}));
      const notificationConfig = {
        slackUrl: systemConfig.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL,
        telegramToken: systemConfig.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN,
        telegramChatId: systemConfig.telegramChatId || process.env.TELEGRAM_CHAT_ID,
      };

      // Use user-defined threshold or default to 70
      const notifyThreshold = config?.minLeadScoreForNotify ?? 70;
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

    const remaining = await redis.llen(listKey);
    const done = remaining === 0;

    if (done && !cursor) {
      // Cache results only when the full scan completes in one request
      const cacheKey = RedisKeys.scanCache(limit, minScore);
      await redis.set(cacheKey, leads, { ex: CACHE_TTL });
    }

    return NextResponse.json({
      success: true,
      cached: false,
      leads: leads.slice(0, limit),
      limit,
      minScore,
      cursor: done ? null : scanToken,
      done,
      stats: {
        total_articles: totalArticles,
        analyzed: articlesToAnalyze.length,
        passed_filter: leads.length,
        remaining,
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

type AnalyzedArticle = { article: NormalizedArticle; analysis: AIAnalysis };

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
