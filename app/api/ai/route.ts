// app/api/ai/route.ts
import { NextResponse } from 'next/server';
import { recommendSegments, Segment } from '@/lib/ai-client';
import fs from 'fs';
import path from 'path';

// Load segments from policy/segments.json
function loadSegments(): Segment[] {
    const filePath = path.join(process.cwd(), 'policy', 'segments.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);

    // Handle both array format and { data: [...] } format
    return Array.isArray(parsed) ? parsed : parsed.data || [];
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { product_name, website_url, num_recommendations = 5 } = body;

        if (!product_name?.trim()) {
            return NextResponse.json(
                { error: '제품명을 입력해주세요.' },
                { status: 400 }
            );
        }

        const segments = loadSegments();
        if (segments.length === 0) {
            return NextResponse.json(
                { error: '세그먼트 데이터를 로드할 수 없습니다.' },
                { status: 500 }
            );
        }

        const result = await recommendSegments(
            product_name,
            website_url || '',
            segments,
            num_recommendations
        );

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('AI recommendation error:', e);
        return NextResponse.json(
            { error: e.message || 'AI 추천 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
