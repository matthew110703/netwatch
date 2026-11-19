import { NextRequest, NextResponse } from 'next/server';
import { searchApi } from '@/lib/api';
import { mapTmdbMovieToCard, mapTmdbTvToCard } from '@/lib/tmdb-image';
import { MediaCardModel, TMDBMovie, TMDBTvShow } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type') || 'all';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  if (!query) {
    return NextResponse.json({
      success: true,
      data: [],
      page: 1,
      totalPages: 1,
      totalResults: 0,
    });
  }

  try {
    let results: MediaCardModel[] = [];
    let currentPage = page;
    let totalPages = 1;
    let totalResults = 0;

    if (type === 'movie') {
      const response = await searchApi.searchMovies({ query, page });
      results = (response.results || []).map((m) => mapTmdbMovieToCard(m));
      currentPage = response.page || page;
      totalPages = response.total_pages || 1;
      totalResults = response.total_results || results.length;
    } else if (type === 'tv') {
      const response = await searchApi.searchTv({ query, page });
      results = (response.results || []).map((t) => mapTmdbTvToCard(t));
      currentPage = response.page || page;
      totalPages = response.total_pages || 1;
      totalResults = response.total_results || results.length;
    } else {
      const response = await searchApi.searchMulti({ query, page });
      const raw = response.results || [];
      results = raw.reduce<MediaCardModel[]>((acc, item) => {
        const mediaType = (item as { media_type?: string }).media_type;
        if (mediaType === 'person') {
          return acc;
        }
        if (mediaType === 'tv' || 'first_air_date' in item) {
          acc.push(mapTmdbTvToCard(item as TMDBTvShow));
        } else if (mediaType === 'movie' || 'title' in item) {
          acc.push(mapTmdbMovieToCard(item as TMDBMovie));
        }
        return acc;
      }, []);
      currentPage = response.page || page;
      totalPages = response.total_pages || 1;
      totalResults = response.total_results || results.length;
    }

    return NextResponse.json(
      {
        success: true,
        data: results,
        page: currentPage,
        totalPages,
        totalResults,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[Search Route] Search failed:', error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
