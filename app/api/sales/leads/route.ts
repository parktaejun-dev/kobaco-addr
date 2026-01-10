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
    const sortBy = searchParams.get('sortBy') || 'latest';
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 200);

    // If sorting by score, we fetch more to find high-score samples
    const fetchLimit = sortBy === 'score' ? Math.max(limit, 100) : limit;

    // Get lead IDs from index
    let leadIds: string[] = [];

    if (statusParam === 'ALL') {
      const members = await redis.zrange(RedisKeys.idxAll(), 0, fetchLimit - 1, {
        rev: true,
      });
      leadIds = members as string[];
    } else if (isValidStatus(statusParam)) {
      const members = await redis.zrange(
        RedisKeys.idxStatus(statusParam as LeadStatusType),
        0,
        fetchLimit - 1,
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

    // Sorting
    if (sortBy === 'score') {
      leads.sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    } else {
      // Default latest (already mostly correct from Redis, but ensure by created_at)
      leads.sort((a, b) => b.created_at - a.created_at);
    }

    // Final limit after sorting
    const finalLeads = leads.slice(0, limit);

    return NextResponse.json({
      success: true,
      leads: finalLeads,
      status: statusParam,
      total: finalLeads.length,
      limit,
      sortBy
    } as LeadsResponse);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
