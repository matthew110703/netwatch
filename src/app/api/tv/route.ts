import { NextResponse } from 'next/server';
import { getTvFeedData } from '@/services/catalog.service';

export const dynamic = 'force-dynamic';

const CACHE_HEADER = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' };

export async function GET() {
  try {
    const data = await getTvFeedData();
    const hasContent =
      data.popularTv.length > 0 || data.topRatedTv.length > 0 || data.onTheAirTv.length > 0;
    if (!hasContent) {
      return NextResponse.json({ success: false, error: 'TV feed empty' }, { status: 502 });
    }
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADER });
  } catch (error) {
    console.error('[API /tv]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load TV feed' },
      { status: 502 }
    );
  }
}