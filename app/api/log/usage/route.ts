
import { NextResponse } from 'next/server';

// TODO: Install @vercel/kv and uncomment to use real DB
// import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // const logs = await kv.lrange('usage_logs', 0, 100);
    // return NextResponse.json(logs);
    
    // Mock Data for Local Development
    const logs = [
      { id: '1', date: new Date().toISOString(), advertiser: '테스트 광고주', product: '신제품 A', budget: 5000, cpv: 120 },
      { id: '2', date: new Date(Date.now() - 3600000).toISOString(), advertiser: '스타트업 B', product: '앱 런칭', budget: 1000, cpv: 250 },
      { id: '3', date: new Date(Date.now() - 86400000).toISOString(), advertiser: '(주)코바코', product: '공익광고', budget: 3000, cpv: 80 },
    ];
    
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
