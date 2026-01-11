/**
 * Sales Config API
 * Manages Naver API credentials, keywords, and RSS feeds
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const REDIS_KEY = 'config:sales:settings';
const MASKED_SECRET = '********';
const MAX_KEYWORDS = 20;
const MAX_RSS_FEEDS = 30;
const MAX_EXCLUDED_COMPANIES = 200;
const MAX_TEMP_EXCLUDED_COMPANIES = 300;

interface RSSFeed {
  category: string;
  originalUrl: string;
  url: string;
  title: string;
  enabled?: boolean;
}

interface ConfigData {
  naverClientId: string;
  naverClientSecret: string;
  naverEnabled?: boolean;
  keywords: string[];
  rssFeeds: RSSFeed[];
  minScore?: number;
  leadNotificationsEnabled?: boolean;
  minLeadScoreForNotify?: number;
  excludedCompanies?: string[];
  excludedCompaniesTemporary?: Array<{ name: string; expiresAt: number }>;
  updated_at?: string;
}

/**
 * GET /api/sales/config
 * Returns config with masked secret
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryMinScore = searchParams.get('minScore');

    const data = await redis.get<ConfigData>(REDIS_KEY);

    if (!data) {
      return NextResponse.json({
        naverClientId: '',
        naverClientSecret: '',
        naverEnabled: true,
        keywords: [],
        rssFeeds: [],
        minScore: 70,
        leadNotificationsEnabled: true,
        minLeadScoreForNotify: 70,
        excludedCompanies: [],
        excludedCompaniesTemporary: [],
      });
    }

    // Never return raw secret
    return NextResponse.json({
      naverClientId: data.naverClientId || '',
      naverClientSecret: data.naverClientSecret ? MASKED_SECRET : '',
      naverEnabled: data.naverEnabled ?? true,
      keywords: data.keywords || [],
      rssFeeds: (data.rssFeeds || []).map(f => ({ ...f, enabled: f.enabled ?? true })),
      minScore: queryMinScore ? Number(queryMinScore) : (data.minScore ?? 70),
      leadNotificationsEnabled: data.leadNotificationsEnabled ?? true,
      minLeadScoreForNotify: data.minLeadScoreForNotify ?? 70,
      excludedCompanies: data.excludedCompanies || [],
      excludedCompaniesTemporary: data.excludedCompaniesTemporary || [],
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales/config
 * Updates config, preserves secret if masked
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      naverClientId,
      naverClientSecret,
      naverEnabled,
      keywords,
      rssFeeds,
      minScore,
      leadNotificationsEnabled,
      minLeadScoreForNotify,
      excludedCompanies,
      excludedCompaniesTemporary,
    } = body;

    // Get existing config
    const existing = await redis.get<ConfigData>(REDIS_KEY);

    // Prepare updated config
    const updatedConfig: ConfigData = {
      naverClientId: (naverClientId?.trim() as string) || '',
      naverClientSecret: '',
      naverEnabled: naverEnabled ?? true,
      keywords: [],
      rssFeeds: [],
      minScore: typeof minScore === 'number' ? minScore : 70,
      leadNotificationsEnabled: typeof leadNotificationsEnabled === 'boolean' ? leadNotificationsEnabled : true,
      minLeadScoreForNotify: typeof minLeadScoreForNotify === 'number' ? minLeadScoreForNotify : 70,
      excludedCompanies: existing?.excludedCompanies || [],
      excludedCompaniesTemporary: existing?.excludedCompaniesTemporary || [],
      updated_at: new Date().toISOString(),
    };

    // Handle secret: only update if new value provided (not masked/empty)
    if (
      naverClientSecret &&
      naverClientSecret !== MASKED_SECRET &&
      naverClientSecret.trim() !== ''
    ) {
      updatedConfig.naverClientSecret = naverClientSecret.trim();
    } else {
      // Keep existing secret
      updatedConfig.naverClientSecret = existing?.naverClientSecret || '';
    }

    // Process keywords - accept array OR comma-separated string
    if (keywords) {
      let keywordList: string[] = [];
      if (Array.isArray(keywords)) {
        keywordList = keywords;
      } else if (typeof keywords === 'string') {
        keywordList = keywords.split(',');
      }
      updatedConfig.keywords = keywordList
        .map((k: any) => (typeof k === 'string' ? k.trim() : ''))
        .filter((k: string) => k.length > 0)
        .slice(0, MAX_KEYWORDS);
    }

    // Process RSS feeds
    if (Array.isArray(rssFeeds)) {
      const seen = new Set<string>();
      const validFeeds: RSSFeed[] = [];

      for (const feed of rssFeeds) {
        if (!feed || typeof feed !== 'object') continue;

        const category = (feed.category || '').trim();
        const originalUrl = (feed.originalUrl || '').trim();
        const url = (feed.url || '').trim();
        const title = (feed.title || '').trim();

        // Validate required fields
        if (!url || !originalUrl) continue;

        // Validate URL format
        if (
          !url.startsWith('http://') &&
          !url.startsWith('https://')
        ) continue;
        if (
          !originalUrl.startsWith('http://') &&
          !originalUrl.startsWith('https://')
        ) continue;

        // Dedupe by url (case-insensitive)
        const urlLower = url.toLowerCase();
        if (seen.has(urlLower)) continue;
        seen.add(urlLower);

        validFeeds.push({
          category,
          originalUrl,
          url,
          title,
          enabled: feed.enabled ?? true
        });

        if (validFeeds.length >= MAX_RSS_FEEDS) break;
      }

      updatedConfig.rssFeeds = validFeeds;
    }

    if (excludedCompanies !== undefined) {
      const companyList = Array.isArray(excludedCompanies)
        ? excludedCompanies
        : typeof excludedCompanies === 'string'
          ? excludedCompanies.split(',')
          : [];

      const seen = new Set<string>();
      const normalized = companyList
        .map((c: any) => (typeof c === 'string' ? c.trim() : ''))
        .filter((c: string) => c.length > 0)
        .filter((c: string) => {
          const key = c.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, MAX_EXCLUDED_COMPANIES);

      updatedConfig.excludedCompanies = normalized;
    }

    if (excludedCompaniesTemporary !== undefined) {
      const now = Date.now();
      const tempList = Array.isArray(excludedCompaniesTemporary)
        ? excludedCompaniesTemporary
        : [];

      const seen = new Set<string>();
      const normalized = tempList
        .map((item: any) => ({
          name: typeof item?.name === 'string' ? item.name.trim() : '',
          expiresAt: Number(item?.expiresAt),
        }))
        .filter((item) => item.name.length > 0 && Number.isFinite(item.expiresAt))
        .filter((item) => item.expiresAt > now)
        .filter((item) => {
          const key = item.name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, MAX_TEMP_EXCLUDED_COMPANIES);

      updatedConfig.excludedCompaniesTemporary = normalized;
    }

    // Save to Redis
    await redis.set(REDIS_KEY, updatedConfig);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
