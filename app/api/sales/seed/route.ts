/**
 * Sales Config Seed API
 * Seeds initial RSS feeds and keywords
 */

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const REDIS_KEY = 'config:sales:settings';

// 초기 키워드 세트 (20개)
const SEED_KEYWORDS = [
    '신제품 출시',
    '서비스 출시',
    '브랜드 런칭',
    '투자 유치',
    '시리즈 A',
    '시리즈 B',
    '마케팅 캠페인',
    '광고 캠페인',
    'CF 공개',
    '엠버서더 발탁',
    '플랫폼 출시',
    '앱 출시',
    '글로벌 진출',
    '한국 진출',
    '파트너십 체결',
    'MOU 체결',
    '리브랜딩',
    '신규 진출',
    '사업 확장',
    '대규모 캠페인',
];

// 초기 RSS 피드 세트
const SEED_RSS_FEEDS = [
    // 뉴스와이어 (기본 - 보도자료)
    {
        category: '신상품/신기술',
        originalUrl: 'https://www.newswire.co.kr/rss/industry/200',
        url: 'https://www.newswire.co.kr/rss/industry/200',
        title: '뉴스와이어 - 신상품/신기술',
    },
    {
        category: '소비재/쇼핑',
        originalUrl: 'https://www.newswire.co.kr/rss/industry/500',
        url: 'https://www.newswire.co.kr/rss/industry/500',
        title: '뉴스와이어 - 소비재/쇼핑',
    },
    {
        category: '생활/식음료',
        originalUrl: 'https://www.newswire.co.kr/rss/industry/504',
        url: 'https://www.newswire.co.kr/rss/industry/504',
        title: '뉴스와이어 - 생활/식음료',
    },
    {
        category: '헬스케어',
        originalUrl: 'https://www.newswire.co.kr/rss/industry/900',
        url: 'https://www.newswire.co.kr/rss/industry/900',
        title: '뉴스와이어 - 헬스케어',
    },
    {
        category: 'IT/플랫폼',
        originalUrl: 'https://www.newswire.co.kr/rss/industry/300',
        url: 'https://www.newswire.co.kr/rss/industry/300',
        title: '뉴스와이어 - IT/인터넷',
    },
    // 스타트업 특화
    {
        category: '스타트업',
        originalUrl: 'https://platum.kr',
        url: 'https://platum.kr/feed',
        title: '플래텀 - 스타트업 뉴스',
    },
    {
        category: '벤처/투자',
        originalUrl: 'https://www.venturesquare.net',
        url: 'https://www.venturesquare.net/feed',
        title: '벤처스퀘어',
    },
    // IT/테크 (보조)
    {
        category: 'IT/테크',
        originalUrl: 'https://www.bloter.net',
        url: 'https://www.bloter.net/feed',
        title: '블로터',
    },
];

/**
 * POST /api/sales/seed
 * Seeds initial config data
 */
export async function POST() {
    try {
        // Get existing config to preserve Naver credentials
        const existing = await redis.get<any>(REDIS_KEY);

        const config = {
            naverClientId: existing?.naverClientId || '',
            naverClientSecret: existing?.naverClientSecret || '',
            keywords: SEED_KEYWORDS,
            rssFeeds: SEED_RSS_FEEDS,
            updated_at: new Date().toISOString(),
        };

        await redis.set(REDIS_KEY, config);

        return NextResponse.json({
            success: true,
            message: 'Config seeded successfully',
            keywords_count: SEED_KEYWORDS.length,
            feeds_count: SEED_RSS_FEEDS.length,
        });
    } catch (error) {
        console.error('Error seeding config:', error);
        return NextResponse.json(
            { error: 'Failed to seed config', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/sales/seed
 * Returns seed data preview
 */
export async function GET() {
    return NextResponse.json({
        keywords: SEED_KEYWORDS,
        rssFeeds: SEED_RSS_FEEDS,
    });
}
