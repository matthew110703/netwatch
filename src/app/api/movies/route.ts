import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getMoviesFeedData } from '@/services/catalog.service';

const CACHE_HEADER = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' };

export async function GET() {
  try {
    const data = await getMoviesFeedData();
    const hasContent =
      data.popularMovies.length > 0 ||
      data.topRatedMovies.length > 0 ||
      data.nowPlayingMovies.length > 0;
    if (!hasContent) {
      return NextResponse.json(
        { success: false, error: 'Movies feed empty' },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADER });
  } catch (error) {
    console.error('[API /movies]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load movies feed' },
      { status: 502 }
    );
  }
}