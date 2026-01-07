import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSection, saveSection, getHome, saveHome } from '@/lib/content/kv';

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
      { step: 1, title: "Step 1", description: "설명을 입력하세요." },
      { step: 2, title: "Step 2", description: "설명을 입력하세요." },
      { step: 3, title: "Step 3", description: "설명을 입력하세요." },
      { step: 4, title: "Step 4", description: "설명을 입력하세요." }
    ]
  },
  imageCards: {
    title: "이미지 카드 섹션",
    subtitle: "이미지와 설명을 통해 내용을 효과적으로 전달하세요.",
    cards: [
      { title: "카드 제목 1", description: "설명을 입력하세요.", image: "" },
      { title: "카드 제목 2", description: "설명을 입력하세요.", image: "" },
      { title: "카드 제목 3", description: "설명을 입력하세요.", image: "" }
    ]
  },
  concept: {
    eyebrow: "Concept",
    title: "새로운 컨셉 섹션",
    description: "컨셉에 대한 설명을 입력하세요.",
    image: ""
  },
  comparison: {
    title: "비교 섹션",
    left: {
      label: "기존 방식",
      headline: "Headline",
      description: "Description",
      points: ["Point 1", "Point 2"]
    },
    right: {
      label: "새로운 방식",
      headline: "Headline",
      description: "Description",
      points: ["Point 1", "Point 2"]
    }
  },
  useCases: {
    title: "활용 사례",
    description: "다양한 활용 사례를 소개합니다.",
    cases: [
      { tag: "Tag 1", title: "Case 1", description: "Description 1" },
      { tag: "Tag 2", title: "Case 2", description: "Description 2" }
    ]
  },
  why: {
    eyebrow: "Why Us",
    title: "왜 선택해야 할까요?",
    description: "서비스의 강점을 설명하세요.",
    cards: [
      { title: "Reason 1", description: "Description 1" },
      { title: "Reason 2", description: "Description 2" },
      { title: "Reason 3", description: "Description 3" }
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
      const data = await getHome();
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
      await saveHome(content);
      revalidatePath('/'); // Refresh Main Page
      return NextResponse.json({ success: true });
    }

    // 2. Save Section Content (DEPRECATED - use /api/admin/section/save instead)
    if (action === 'save_section' || (!action && type === 'section')) {
      // This legacy endpoint doesn't have 'type' info needed for proper key pattern
      // Redirect to use the proper endpoint
      return NextResponse.json({
        error: 'Deprecated',
        message: 'Use /api/admin/section/save with {id, type, data} instead'
      }, { status: 400 });
    }

    // 3. Create New Section
    if (action === 'create_section') {
      const homeData = await getHome();

      let newId = `${type}-1`;
      let counter = 1;
      // Defensive check if homeData.sections exists
      const sections = homeData?.sections || [];

      while (sections.find((s: any) => s.id === newId)) {
        counter++;
        newId = `${type}-${counter}`;
      }

      const template = TEMPLATES[type] || { title: "New Section" };
      await saveSection(newId, type, template);

      sections.push({ id: newId, type, enabled: true });
      await saveHome({ ...homeData, sections });

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