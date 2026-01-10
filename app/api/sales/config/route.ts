/**
 * Sales Config API
 * Manages Naver API credentials and keywords
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { RedisKeys } from '@/lib/crm-types';

const MASKED_SECRET = '********';
const MAX_KEYWORDS = 20;

interface ConfigData {
  naverClientId: string;
  naverClientSecret: string;
  keywords: string[];
}

/**
 * GET /api/sales/config
 * Returns config with masked secret
 */
export async function GET() {
  try {
    const key = RedisKeys.config();
    const data = await redis.get<ConfigData>(key);

    if (!data) {
      return NextResponse.json({
        naverClientId: '',
        naverClientSecret: MASKED_SECRET,
        keywords: [],
      });
    }

    // Never return raw secret
    return NextResponse.json({
      naverClientId: data.naverClientId || '',
      naverClientSecret: MASKED_SECRET,
      keywords: data.keywords || [],
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

    const { naverClientId, naverClientSecret, keywords } = body;

    // Get existing config
    const key = RedisKeys.config();
    const existing = await redis.get<ConfigData>(key);

    // Prepare updated config
    const updatedConfig: ConfigData = {
      naverClientId: naverClientId?.trim() || '',
      naverClientSecret: '',
      keywords: [],
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

    // Process keywords
    if (Array.isArray(keywords)) {
      updatedConfig.keywords = keywords
        .map((k: any) => (typeof k === 'string' ? k.trim() : ''))
        .filter((k: string) => k.length > 0)
        .slice(0, MAX_KEYWORDS);
    }

    // Save to Redis
    await redis.set(key, updatedConfig);

    return NextResponse.json({
      success: true,
      naverClientId: updatedConfig.naverClientId,
      naverClientSecret: MASKED_SECRET,
      keywords: updatedConfig.keywords,
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
