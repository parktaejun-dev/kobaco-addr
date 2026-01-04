import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { saveSection } from '@/lib/content/kv';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, type, data } = body;

        if (!id || !type || !data) {
            return NextResponse.json({ error: 'Missing Required Fields (id, type, data)' }, { status: 400 });
        }

        // saveSection performs strict Zod validation
        await saveSection(id, type, data);

        revalidatePath('/'); // Refresh Landing Page

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Section Save Error:', e);

        // Return Validation Errors clearly
        if (e.message.startsWith('Validation Failed')) {
            return NextResponse.json({
                error: 'Validation Error',
                message: e.message
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Save Failed',
            message: e.message
        }, { status: 500 });
    }
}
