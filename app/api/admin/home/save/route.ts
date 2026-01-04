import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { saveHome } from '@/lib/content/kv';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate body structure briefly (Detailed validation inside saveHome)
        if (!body.sections || !Array.isArray(body.sections)) {
            return NextResponse.json({ error: 'Invalid Home Config' }, { status: 400 });
        }

        await saveHome(body);
        revalidatePath('/'); // Refresh Landing Page

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Home Save Error:', e);
        return NextResponse.json({
            error: 'Save Failed',
            message: e.message
        }, { status: 500 });
    }
}
