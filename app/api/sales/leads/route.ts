/**
 * Sales Leads Pipeline API
 * List leads by status with CRM data
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  RedisKeys,
  LeadStatus,
  isValidStatus,
  type LeadCore,
  type LeadState,
  type Lead,
  type LeadStatusType,
} from '@/lib/crm-types';

export const dynamic = 'force-dynamic';

interface LeadsResponse {
  success: boolean;
  leads: Lead[];
  status: string;
  total: number;
  limit: number;
}

/**
 * GET /api/sales/leads?status=ALL&limit=50
 * Returns leads with state and notes count
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'ALL';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      200
    );

    // Get lead IDs from index
    let leadIds: string[] = [];

    if (statusParam === 'ALL') {
      // Get from all index (reverse order = newest first)
      const members = await redis.zrange(RedisKeys.idxAll(), 0, limit - 1, {
        rev: true,
      });
      leadIds = members as string[];
    } else if (isValidStatus(statusParam)) {
      // Get from status-specific index (reverse order = newest first)
      const members = await redis.zrange(
        RedisKeys.idxStatus(statusParam as LeadStatusType),
        0,
        limit - 1,
        { rev: true }
      );
      leadIds = members as string[];
    } else {
      return NextResponse.json(
        { error: 'Invalid status parameter' },
        { status: 400 }
      );
    }

    // Fetch LeadCore and LeadState in pipeline
    const leads: Lead[] = [];

    for (const leadId of leadIds) {
      const [core, state, notesCount] = await Promise.all([
        redis.get<LeadCore>(RedisKeys.leadCore(leadId)),
        redis.get<LeadState>(RedisKeys.leadState(leadId)),
        redis.llen(RedisKeys.leadNotes(leadId)),
      ]);

      if (core && state) {
        leads.push({
          ...core,
          state,
          notes_count: notesCount || 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      leads,
      status: statusParam,
      total: leads.length,
      limit,
    } as LeadsResponse);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
