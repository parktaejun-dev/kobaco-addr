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
}

// ============================================================================
// RSS Feed Sources (Korean Newswires)
// ============================================================================

const RSS_FEEDS = [
  {
    name: '연합뉴스',
    url: 'https://www.yonhapnewstv.co.kr/category/news/economy/feed/',
  },
  {
    name: '뉴시스',
    url: 'https://newsis.com/RSS/economy.xml',
  },
  {
    name: '뉴스1',
    url: 'https://www.news1.kr/rss/S1N1.xml',
  },
] as const;

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
  sourceName: string,
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
      _keyword: sourceName,
    }));
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${sourceName}:`, error);
    return [];
  }
}

/**
 * Fetch articles from all RSS feeds
 */
export async function fetchAllRSSFeeds(
  limitPerFeed: number = 6
): Promise<NormalizedArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchFeed(feed.url, feed.name, limitPerFeed))
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
 * Fetch articles from specific RSS feeds by name
 */
export async function fetchRSSByNames(
  feedNames: string[],
  limitPerFeed: number = 6
): Promise<NormalizedArticle[]> {
  const selectedFeeds = RSS_FEEDS.filter((feed) =>
    feedNames.includes(feed.name)
  );

  const results = await Promise.allSettled(
    selectedFeeds.map((feed) => fetchFeed(feed.url, feed.name, limitPerFeed))
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
 * Get list of available RSS feed names
 */
export function getAvailableFeeds(): string[] {
  return RSS_FEEDS.map((feed) => feed.name);
}
