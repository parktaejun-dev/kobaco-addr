/**
 * Bulk Lead Delete API
 * Removes multiple leads from Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { RedisKeys, type LeadState } from '@/lib/crm-types';

export async function POST(request: NextRequest) {
    try {
        const { leadIds } = await request.json();

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: 'Lead IDs are required' }, { status: 400 });
        }

        // Process each lead
        // In a more complex app, we'd use a transaction or lua script
        // For now, Promise.all is sufficient for small batches
        await Promise.all(
            leadIds.map(async (leadId) => {
                const state = await redis.get<LeadState>(RedisKeys.leadState(leadId));

                await Promise.all([
                    redis.del(RedisKeys.leadCore(leadId)),
                    redis.del(RedisKeys.leadState(leadId)),
                    redis.del(RedisKeys.leadNotes(leadId)),
                    redis.zRem(RedisKeys.idxAll(), leadId),
                    state ? redis.zRem(RedisKeys.idxStatus(state.status), leadId) : Promise.resolve(),
                ]);
            })
        );

        return NextResponse.json({ success: true, deletedCount: leadIds.length });
    } catch (error) {
        console.error('Error in bulk delete:', error);
        return NextResponse.json(
            { error: 'Failed to delete leads' },
            { status: 500 }
        );
    }
}
