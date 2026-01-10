/**
 * RSS Feed Parser for KOBACO Lead Sniper
 * Fetches latest news from Korean newswire sources
 */

import Parser from 'rss-parser';
import { stripHtml } from './crm-types';

// ============================================================================
// Types
// ============================================================================

export interface NormalizedArticle {
  title: string;
  link: string;
  contentSnippet: string;
  pubDate: string;
  _source: string;
  _keyword?: string;
  _category?: string;
}

export interface RSSFeedConfig {
  category: string;
  url: string;
  title?: string;
  originalUrl?: string;
}

// ============================================================================
// Default RSS Feed Sources (Fallback)
// ============================================================================

const DEFAULT_RSS: RSSFeedConfig[] = [
  { category: '신상품/신기술', url: 'https://www.newswire.co.kr/rss/industry/200' },
  { category: '소비재/쇼핑', url: 'https://www.newswire.co.kr/rss/industry/500' },
  { category: '생활/식음료', url: 'https://www.newswire.co.kr/rss/industry/504' },
  { category: '헬스케어', url: 'https://www.newswire.co.kr/rss/industry/900' },
];

// ============================================================================
// RSS Parser
// ============================================================================

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'KOBACO-Lead-Sniper/1.0',
  },
});

/**
 * Fetch articles from a single RSS feed
 */
async function fetchFeed(
  feedUrl: string,
  category: string,
  limit: number = 6
): Promise<NormalizedArticle[]> {
  try {
    const feed = await parser.parseURL(feedUrl);

    return feed.items.slice(0, limit).map((item) => ({
      title: stripHtml(item.title || ''),
      link: item.link || '',
      contentSnippet: stripHtml(item.contentSnippet || item.content || ''),
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      _source: 'RSS',
      _keyword: category,
      _category: category,
    }));
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${category} (${feedUrl}):`, error);
    return [];
  }
}

/**
 * Fetch articles from custom/configured RSS feeds
 */
export async function fetchCustomFeeds(
  feeds: RSSFeedConfig[],
  limitPerFeed: number = 6
): Promise<NormalizedArticle[]> {
  if (!feeds || feeds.length === 0) {
    return fetchDefaultFeeds(limitPerFeed);
  }

  const results = await Promise.allSettled(
    feeds.map((feed) => fetchFeed(feed.url, feed.category, limitPerFeed))
  );

  const articles: NormalizedArticle[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    }
  }

  return articles;
}

/**
 * Fetch articles from default RSS feeds (fallback)
 */
export async function fetchDefaultFeeds(
  limitPerFeed: number = 6
): Promise<NormalizedArticle[]> {
  const results = await Promise.allSettled(
    DEFAULT_RSS.map((feed) => fetchFeed(feed.url, feed.category, limitPerFeed))
  );

  const articles: NormalizedArticle[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    }
  }

  return articles;
}

/**
 * Fetch articles from all RSS feeds (legacy - uses default feeds)
 */
export async function fetchAllRSSFeeds(
  limitPerFeed: number = 6
): Promise<NormalizedArticle[]> {
  return fetchDefaultFeeds(limitPerFeed);
}

/**
 * Get default RSS feed configs
 */
export function getDefaultRSSFeeds(): RSSFeedConfig[] {
  return [...DEFAULT_RSS];
}
