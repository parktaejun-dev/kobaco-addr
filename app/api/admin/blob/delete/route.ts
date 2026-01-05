import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request): Promise<NextResponse> {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: 'Vercel Blob not configured' }, { status: 500 });
    }

    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Only delete if it's a Vercel Blob URL
        if (!url.includes('blob.vercel-storage.com')) {
            return NextResponse.json({ error: 'Not a Vercel Blob URL' }, { status: 400 });
        }

        await del(url);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Blob Delete Error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
