import { NextResponse } from 'next/server';
import { getSystemConfig, saveSystemConfig } from '@/lib/content/kv';

export async function GET() {
    try {
        const config = await getSystemConfig();
        // Determine if values are set (don't return full secrets to frontend if you want to mask them, 
        // but for this simple admin panel, returning them is acceptable as it's an admin-only route)
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Merge with existing config to avoid overwriting other potential future keys
        const current = await getSystemConfig();
        const newConfig = { ...current, ...body };

        await saveSystemConfig(newConfig);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Config Save Error:', error);
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
