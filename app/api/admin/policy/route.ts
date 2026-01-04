import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getJSON, setJSON } from '@/lib/kv-store';

// Whitelist of allowed policy types
const ALLOWED_TYPES = ['channels', 'bonuses', 'surcharges', 'segments'] as const;
type PolicyType = typeof ALLOWED_TYPES[number];

const isValidType = (type: string | null): type is PolicyType => {
  return type !== null && ALLOWED_TYPES.includes(type as PolicyType);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type) return NextResponse.json({ error: 'Type required' }, { status: 400 });

  // Whitelist validation
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Invalid type. Allowed: channels, bonuses, surcharges, segments' }, { status: 400 });
  }

  try {
    const data = await getJSON('policy', type);
    return NextResponse.json(data || []);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, data } = body;

  if (!type || !data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  // Whitelist validation
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Invalid type. Allowed: channels, bonuses, surcharges, segments' }, { status: 400 });
  }

  try {
    await setJSON('policy', type, data);
    revalidatePath('/estimate'); // Refresh Estimate Page Cache
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save', details: e.message }, { status: 500 });
  }
}
