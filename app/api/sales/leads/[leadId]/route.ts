/**
 * Lead Delete API
 * Removes all trace of a lead from Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { RedisKeys, LeadStatus, type LeadState } from '@/lib/crm-types';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { leadId: string } }
) {
    try {
        const { leadId } = params;

        if (!leadId) {
            return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
        }

        // Get current state to know which status index to remove from
        const state = await redis.get<LeadState>(RedisKeys.leadState(leadId));

        // Cleanup keys
        await Promise.all([
            redis.del(RedisKeys.leadCore(leadId)),
            redis.del(RedisKeys.leadState(leadId)),
            redis.del(RedisKeys.leadNotes(leadId)),
            redis.zRem(RedisKeys.idxAll(), leadId),
            state ? redis.zRem(RedisKeys.idxStatus(state.status), leadId) : Promise.resolve(),
        ]);

        return NextResponse.json({ success: true, leadId });
    } catch (error) {
        console.error('Error deleting lead:', error);
        return NextResponse.json(
            { error: 'Failed to delete lead' },
            { status: 500 }
        );
    }
}
