import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { DEFAULT_REGION, normalizeRegionCode } from '@/lib/region';
import { getHomeFeedData } from '@/services/catalog.service';

const CACHE_HEADER = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' };

function feedHasContent(data: Awaited<ReturnType<typeof getHomeFeedData>>): boolean {
  return (
    Boolean(data.billboardItem) ||
    data.trendingItems.length > 0 ||
    data.topPicksItems.length > 0 ||
    data.popularTvItems.length > 0 ||
    data.topRatedItems.length > 0 ||
    data.regionTopMovies.length > 0 ||
    data.regionTopTv.length > 0 ||
    data.languageRails.some((rail) => rail.items.length > 0)
  );
}

export async function GET(request: NextRequest) {
  const region =
    normalizeRegionCode(request.nextUrl.searchParams.get('region')) ?? DEFAULT_REGION;

  try {
    const data = await getHomeFeedData(region);
    if (!feedHasContent(data)) {
      return NextResponse.json(
        { success: false, error: 'Home feed returned no catalog content' },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADER });
  } catch (error) {
    console.error('[API /home]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load home feed' },
      { status: 502 }
    );
  }
}