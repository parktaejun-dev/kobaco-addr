import { NextResponse } from 'next/server';
import { trackCtaClick } from '@/lib/content/kv';

const ALLOWED_CTAS = ['estimate_open', 'download_pdf', 'contact_open', 'header_estimate', 'hero_estimate', 'footer_estimate'];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ctaId } = body;

        if (!ctaId || !ALLOWED_CTAS.includes(ctaId)) {
            // Allow dynamic IDs from CMS too? For now, strict allowlist or logic check
            // If ID starts with 'cms_', maybe allow it. 
            // But for safety, let's just log whatever string if it looks like a slug
            if (!ctaId.match(/^[a-z0-9_-]+$/)) {
                return NextResponse.json({ error: 'Invalid CTA ID' }, { status: 400 });
            }
        }

        await trackCtaClick(ctaId);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('CTA Event Error', e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
