
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  try {
    if (type === 'home') {
      const data = fs.readFileSync(path.join(CONTENT_DIR, 'home.json'), 'utf-8');
      return NextResponse.json(JSON.parse(data));
    } else if (type === 'section' && id) {
      const filePath = path.join(CONTENT_DIR, 'sections', `${id}.json`);
      if (!fs.existsSync(filePath)) {
          // If file doesn't exist, return empty object or default
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
  const { type, id, content } = body;

  try {
    if (type === 'home') {
      fs.writeFileSync(path.join(CONTENT_DIR, 'home.json'), JSON.stringify(content, null, 2));
    } else if (type === 'section' && id) {
      fs.writeFileSync(path.join(CONTENT_DIR, 'sections', `${id}.json`), JSON.stringify(content, null, 2));
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
