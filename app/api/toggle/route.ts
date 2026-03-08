import { NextRequest, NextResponse } from 'next/server';
import { toggleItem } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, userId } = body as { itemId?: string; userId?: string };

    if (!itemId || !userId) {
      return NextResponse.json(
        { error: 'itemId and userId are required' },
        { status: 400 },
      );
    }

    const result = await toggleItem(itemId, userId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
