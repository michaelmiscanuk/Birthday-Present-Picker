import { NextResponse } from 'next/server';
import { resetState } from '@/lib/store';

export async function POST() {
  try {
    const state = await resetState();
    return NextResponse.json({ success: true, state });
  } catch {
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
