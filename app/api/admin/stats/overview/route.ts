import { NextResponse } from 'next/server';
import { getStatsDashboard } from '@/lib/content/kv';

export async function GET() {
    try {
        const stats = await getStatsDashboard();
        return NextResponse.json(stats);
    } catch (e) {
        console.error('Stats Overview Error', e);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
