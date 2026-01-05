import { NextResponse } from 'next/server';
import { deleteSection, getHome, saveHome } from '@/lib/content/kv';

export async function DELETE(request: Request): Promise<NextResponse> {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
        }

        // 1. Delete section data from Redis
        await deleteSection(id);

        // 2. Remove from home config
        const home = await getHome();
        if (home?.sections) {
            home.sections = home.sections.filter((s: any) => s.id !== id);
            await saveHome(home);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Section Delete Error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
