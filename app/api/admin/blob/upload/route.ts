import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { trackImageUpload } from '@/lib/content/kv';

export async function POST(request: Request): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || `upload-${Date.now()}.png`;

    // Check if Blob token is configured (for local dev safety)
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: 'Vercel Blob not configured' }, { status: 500 });
    }

    try {
        const blob = await put(filename, request.body as ReadableStream, {
            access: 'public',
        });

        // Track stats
        await trackImageUpload();

        return NextResponse.json(blob);
    } catch (error) {
        console.error('Blob Upload Error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
