import { NextResponse } from 'next/server';
import { getState } from '@/lib/store';

// Force dynamic so Next.js never statically pre-renders this route.
// The CDN cache headers below handle runtime caching at the edge.
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await getState();
  return NextResponse.json(state, {
    headers: {
      // Vercel CDN caches the response for 10 s; serves stale for 20 s more
      // while revalidating in the background.  All clients within those 10 s
      // hit the edge cache → zero serverless invocations.
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
    },
  });
}
