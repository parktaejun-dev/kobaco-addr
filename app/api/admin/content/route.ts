import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');

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
  const type = searchParams.get('type');
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
      const data = fs.readFileSync(path.join(CONTENT_DIR, 'home.json'), 'utf-8');
      return NextResponse.json(JSON.parse(data));
    } else if (type === 'section' && id) {
      const filePath = path.join(CONTENT_DIR, 'sections', `${id}.json`);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({});
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, type, id, content } = body;

  // Path Traversal prevention - validate id and type format
  const isValidId = (value: string | null | undefined): boolean => {
    if (!value) return true;
    return /^[a-zA-Z0-9-]+$/.test(value);
  };

  if (id && !isValidId(id)) {
    return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
  }
  if (type && !isValidId(type)) {
    return NextResponse.json({ error: 'Invalid type format' }, { status: 400 });
  }

  try {
    // 1. Save Home Config (Reorder / Toggle)
    if (action === 'save_home' || (!action && type === 'home')) {
      fs.writeFileSync(path.join(CONTENT_DIR, 'home.json'), JSON.stringify(content, null, 2));
      return NextResponse.json({ success: true });
    }

    // 2. Save Section Content
    if (action === 'save_section' || (!action && type === 'section')) {
      fs.writeFileSync(path.join(CONTENT_DIR, 'sections', `${id}.json`), JSON.stringify(content, null, 2));
      return NextResponse.json({ success: true });
    }

    // 3. Create New Section
    if (action === 'create_section') {
      const homeData = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'home.json'), 'utf-8'));

      let newId = `${type}-1`;
      let counter = 1;
      while (homeData.sections.find((s: any) => s.id === newId)) {
        counter++;
        newId = `${type}-${counter}`;
      }

      const template = TEMPLATES[type] || { title: "New Section" };
      fs.writeFileSync(path.join(CONTENT_DIR, 'sections', `${newId}.json`), JSON.stringify(template, null, 2));

      homeData.sections.push({ id: newId, type, enabled: true });
      fs.writeFileSync(path.join(CONTENT_DIR, 'home.json'), JSON.stringify(homeData, null, 2));

      return NextResponse.json({ success: true, id: newId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}