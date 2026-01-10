import { NextResponse } from 'next/server';
import { getJSON, setJSON } from '@/lib/kv-store';

export async function GET() {
  try {
    let logs = await getJSON('policy', 'usage_logs');
    
    if (!logs) {
      logs = [];
    }
    
    // Safety check to ensure logs is an array
    if (!Array.isArray(logs)) {
      console.warn('Logs data is not an array, resetting to empty array');
      logs = [];
    }

    // Sort by date descending
    logs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { advertiser, product, budget, cpv, type } = body;

    const newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      advertiser: advertiser || 'N/A',
      product: product || 'N/A',
      budget: budget || 0,
      cpv: cpv || 0,
      type: type || 'analysis' // 'analysis' or 'print'
    };

    let logs = await getJSON('policy', 'usage_logs');
    
    if (!logs || !Array.isArray(logs)) {
      logs = [];
    }

    logs.push(newLog);
    
    // Save to KV Store (Redis) or Filesystem (if local)
    await setJSON('policy', 'usage_logs', logs);

    return NextResponse.json({ success: true, log: newLog });
  } catch (error) {
    console.error('Logging error:', error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}