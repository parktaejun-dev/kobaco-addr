/**
 * Naver News API Integration for KOBACO Lead Sniper
 * Fetches news articles by keywords
 */

import { stripHtml } from './crm-types';
import type { NormalizedArticle } from './rss-parser';

// ============================================================================
// Types
// ============================================================================

export interface NaverConfig {
  naverClientId: string;
  naverClientSecret: string;
  keywords: string[];
}

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverNewsResponse {
  items: NaverNewsItem[];
}

// ============================================================================
// Constants
// ============================================================================

const NAVER_NEWS_API = 'https://openapi.naver.com/v1/search/news.json';
const MAX_KEYWORDS = 5;
const ITEMS_PER_KEYWORD = 10;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch news for a single keyword
 */
async function fetchNewsForKeyword(
  keyword: string,
  clientId: string,
  clientSecret: string
): Promise<NormalizedArticle[]> {
  const params = new URLSearchParams({
    query: keyword,
    display: ITEMS_PER_KEYWORD.toString(),
    sort: 'date',
  });

  const url = `${NAVER_NEWS_API}?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      console.error(
        `Naver API error for keyword "${keyword}":`,
        response.status,
        response.statusText
      );
      return [];
    }

    const data: NaverNewsResponse = await response.json();

    return data.items.map((item) => ({
      title: stripHtml(item.title),
      link: item.originallink?.trim() || item.link?.trim() || '',
      contentSnippet: stripHtml(item.description),
      pubDate: item.pubDate,
      _source: 'NAVER',
      _keyword: keyword,
    }));
  } catch (error) {
    console.error(`Failed to fetch Naver news for keyword "${keyword}":`, error);
    return [];
  }
}

/**
 * Fetch news for multiple keywords
 * Max 5 keywords as per spec
 */
export async function fetchNaverNews(
  config: NaverConfig
): Promise<NormalizedArticle[]> {
  if (!config.naverClientId || !config.naverClientSecret) {
    console.warn('Naver API credentials not configured');
    return [];
  }

  if (!config.keywords || config.keywords.length === 0) {
    console.warn('No Naver keywords configured');
    return [];
  }

  // Take max 5 keywords
  const keywords = config.keywords.slice(0, MAX_KEYWORDS);

  const results = await Promise.allSettled(
    keywords.map((keyword) =>
      fetchNewsForKeyword(keyword, config.naverClientId, config.naverClientSecret)
    )
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
 * Validate Naver API credentials
 */
export async function validateNaverCredentials(
  clientId: string,
  clientSecret: string
): Promise<boolean> {
  const params = new URLSearchParams({
    query: '테스트',
    display: '1',
  });

  const url = `${NAVER_NEWS_API}?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
