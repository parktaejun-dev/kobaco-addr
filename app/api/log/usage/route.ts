
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'policy', 'usage_logs.json');

export async function GET() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(LOG_FILE, 'utf-8');
    const logs = JSON.parse(data);

    // Sort by date descending
    logs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(logs);
  } catch (error) {
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

    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf-8');
      logs = JSON.parse(data);
    }

    logs.push(newLog);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

    return NextResponse.json({ success: true, log: newLog });
  } catch (error) {
    console.error('Logging error:', error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}
