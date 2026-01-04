import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getJSON, setJSON } from '@/lib/kv-store';
import { getSection } from '@/lib/content/kv';

const TEMPLATES: Record<string, any> = {
  valueProps: {
    title: "새로운 특장점 섹션",
    cards: [
      { title: "특장점 1", description: "설명을 입력하세요." },
      { title: "특장점 2", description: "설명을 입력하세요." },
      { title: "특장점 3", description: "설명을 입력하세요." }
    ]
  },
  faq: {
    title: "자주 묻는 질문",
    questions: [
      { question: "질문 1", answer: "답변을 입력하세요." }
    ]
  },
  reporting: {
    title: "성과 리포트",
    description: "리포트에 대한 설명을 입력하세요.",
    image: ""
  },
  estimateGuide: {
    title: "견적 가이드",
    steps: ["1단계 설명", "2단계 설명", "3단계 설명"]
  },
  howItWorks: {
    title: "이용 방법",
    steps: [
      { title: "Step 1", description: "Description" }
    ]
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'home' or 'section'
  const id = searchParams.get('id');

  // Path Traversal prevention - validate id format
  const isValidId = (value: string | null): boolean => {
    if (!value) return true; // null is allowed (for 'home' type)
    return /^[a-zA-Z0-9-]+$/.test(value);
  };

  if (id && !isValidId(id)) {
    return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
  }

  try {
    if (type === 'home') {
      const data = await getJSON('content', 'home');
      return NextResponse.json(data || {});
    } else if (type === 'section' && id) {
      const data = await getSection(id);
      return NextResponse.json(data || {});
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Data not found' }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, type, id, content } = body;

  // Path Traversal prevention
  const isValidId = (value: string | null | undefined): boolean => {
    if (!value) return true;
    return /^[a-zA-Z0-9-]+$/.test(value);
  };

  if (id && !isValidId(id)) return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
  if (type && !isValidId(type)) return NextResponse.json({ error: 'Invalid type format' }, { status: 400 });

  try {
    // 1. Save Home Config
    if (action === 'save_home' || (!action && type === 'home')) {
      await setJSON('content', 'home', content);
      revalidatePath('/'); // Refresh Main Page
      return NextResponse.json({ success: true });
    }

    // 2. Save Section Content
    if (action === 'save_section' || (!action && type === 'section')) {
      if (!id) return NextResponse.json({ error: 'ID is required for section save' }, { status: 400 });
      await setJSON('content', id, content);
      revalidatePath('/'); // Refresh Main Page
      return NextResponse.json({ success: true });
    }

    // 3. Create New Section
    if (action === 'create_section') {
      const homeData = await getJSON('content', 'home');

      let newId = `${type}-1`;
      let counter = 1;
      // Defensive check if homeData.sections exists
      const sections = homeData?.sections || [];

      while (sections.find((s: any) => s.id === newId)) {
        counter++;
        newId = `${type}-${counter}`;
      }

      const template = TEMPLATES[type] || { title: "New Section" };
      await setJSON('content', newId, template);

      sections.push({ id: newId, type, enabled: true });
      await setJSON('content', 'home', { ...homeData, sections });

      revalidatePath('/'); // Refresh Main Page
      return NextResponse.json({ success: true, id: newId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error('API Error:', e);
    return NextResponse.json({
      error: 'Operation failed',
      message: e.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 });
  }
}