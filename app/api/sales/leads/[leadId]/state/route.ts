/**
 * Lead State Update API
 * Update lead status and metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  RedisKeys,
  isValidStatus,
  type LeadState,
  type LeadStatusType,
} from '@/lib/crm-types';

export const dynamic = 'force-dynamic';

interface UpdateStateRequest {
  status?: LeadStatusType;
  tags?: string[];
  next_action?: string;
  assigned_to?: string;
  last_contacted_at?: number;
}

/**
 * PATCH /api/sales/leads/[leadId]/state
 * Update lead state and move between status indices
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body: UpdateStateRequest = await request.json();

    // Fetch existing state
    const stateKey = RedisKeys.leadState(leadId);
    const existingState = await redis.get<LeadState>(stateKey);

    if (!existingState) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const oldStatus = existingState.status;
    const newStatus = body.status || oldStatus;

    // Validate new status
    if (body.status && !isValidStatus(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Build updated state
    const updatedState: LeadState = {
      ...existingState,
      status: newStatus,
      status_changed_at:
        newStatus !== oldStatus ? Date.now() : existingState.status_changed_at,
      tags: body.tags !== undefined ? body.tags : existingState.tags,
      next_action:
        body.next_action !== undefined
          ? body.next_action
          : existingState.next_action,
      assigned_to:
        body.assigned_to !== undefined
          ? body.assigned_to
          : existingState.assigned_to,
      last_contacted_at:
        body.last_contacted_at !== undefined
          ? body.last_contacted_at
          : existingState.last_contacted_at,
    };

    // Pipeline: update state + move between indices
    const pipeline = redis.pipeline();
    const timestamp = Date.now();

    // Save updated state
    pipeline.set(stateKey, updatedState);

    // Update idxAll
    pipeline.zadd(RedisKeys.idxAll(), { score: timestamp, member: leadId });

    // If status changed, move between status indices
    if (newStatus !== oldStatus) {
      // Remove from old status index
      pipeline.zrem(RedisKeys.idxStatus(oldStatus), leadId);

      // Add to new status index
      pipeline.zadd(RedisKeys.idxStatus(newStatus), {
        score: timestamp,
        member: leadId,
      });
    } else {
      // Just refresh timestamp in current status index
      pipeline.zadd(RedisKeys.idxStatus(newStatus), {
        score: timestamp,
        member: leadId,
      });
    }

    await pipeline.exec();

    return NextResponse.json({
      success: true,
      state: updatedState,
    });
  } catch (error) {
    console.error('Error updating lead state:', error);
    return NextResponse.json(
      { error: 'Failed to update state' },
      { status: 500 }
    );
  }
}
