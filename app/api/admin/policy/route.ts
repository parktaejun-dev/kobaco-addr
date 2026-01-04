
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const POLICY_DIR = path.join(process.cwd(), 'policy');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'channels', 'bonuses', 'surcharges', 'segments'

  if (!type) return NextResponse.json({ error: 'Type required' }, { status: 400 });

  try {
    const filePath = path.join(POLICY_DIR, `${type}.json`);
    if (!fs.existsSync(filePath)) return NextResponse.json([]);
    const data = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, data } = body;

  if (!type || !data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  try {
    const filePath = path.join(POLICY_DIR, `${type}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
