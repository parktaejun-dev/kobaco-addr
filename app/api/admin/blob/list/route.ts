import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { blobs } = await list();
    return NextResponse.json(blobs);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list blobs' },
      { status: 500 }
    );
  }
}
