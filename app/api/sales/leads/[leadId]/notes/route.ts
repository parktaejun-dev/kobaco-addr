/**
 * Lead Notes API
 * Append-only notes for call logs and activities
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';
import { RedisKeys, type LeadNote } from '@/lib/crm-types';

export const dynamic = 'force-dynamic';

const MAX_NOTES = 200;

/**
 * GET /api/sales/leads/[leadId]/notes
 * Returns all notes for a lead (newest first)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const notesKey = RedisKeys.leadNotes(leadId);

    // Get all notes from Redis list (newest first: index 0 is newest)
    const rawNotes = await redis.lrange(notesKey, 0, -1);

    const notes: LeadNote[] = rawNotes.map((raw) => {
      if (typeof raw === 'string') {
        return JSON.parse(raw);
      }
      return raw as LeadNote;
    });

    return NextResponse.json({
      success: true,
      notes,
      total: notes.length,
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales/leads/[leadId]/notes
 * Add a new note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await request.json();

    const { content, author } = body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    const note: LeadNote = {
      id: randomUUID(),
      lead_id: leadId,
      content: content.trim(),
      author: author || undefined,
      created_at: Date.now(),
    };

    const notesKey = RedisKeys.leadNotes(leadId);

    // Pipeline: add note + trim to max + bump indices
    const pipeline = redis.pipeline();

    // Add note to beginning of list (newest first)
    pipeline.lpush(notesKey, JSON.stringify(note));

    // Trim to max notes
    pipeline.ltrim(notesKey, 0, MAX_NOTES - 1);

    // Bump ordering in indices
    const timestamp = Date.now();
    pipeline.zadd(RedisKeys.idxAll(), { score: timestamp, member: leadId });

    // Get current state to update status index
    const state = await redis.get(RedisKeys.leadState(leadId));
    if (state && typeof state === 'object' && 'status' in state) {
      pipeline.zadd(RedisKeys.idxStatus(state.status as any), {
        score: timestamp,
        member: leadId,
      });
    }

    await pipeline.exec();

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error) {
    console.error('Error adding note:', error);
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    );
  }
}
