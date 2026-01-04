import { NextResponse } from 'next/server';
import { trackSearch } from '@/lib/content/kv';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { q } = body;

        // Basic Validation & Sanitization
        if (!q || typeof q !== 'string') {
            return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
        }

        const trimmed = q.trim().substring(0, 120); // Limit length
        if (trimmed.length < 2) {
            return NextResponse.json({ msg: 'Query too short, skipped' });
        }

        // Mask PII (Phone numbers, emails) - Naive but sufficient regex
        const masked = trimmed
            .replace(/\d{3}-\d{3,4}-\d{4}/g, '***-****-****') // Phone
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '*****@***.**'); // Email

        // Track Stats (Async fire-and-forget logic if speed needed, but here we await for safety)
        await trackSearch(masked);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Search Event Error', e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
