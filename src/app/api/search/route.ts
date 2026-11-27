import { NextRequest, NextResponse } from 'next/server';
import { searchApi } from '@/lib/api';
import { mapTmdbMovieToCard, mapTmdbTvToCard } from '@/lib/tmdb-image';
import { MediaCardModel, TMDBMovie, TMDBTvShow } from '@/lib/types';
import { searchAniList } from '@/services/anime-catalog.service';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
};

const ANIME_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
};

async function fetchTmdbPage(query: string, type: string, page: number) {
  if (type === 'movie') {
    const response = await searchApi.searchMovies({ query, page });
    const results = (response.results || []).map((m) => mapTmdbMovieToCard(m));
    return {
      results,
      currentPage: response.page || page,
      totalPages: response.total_pages || 1,
      totalResults: response.total_results || results.length,
    };
  }
  if (type === 'tv') {
    const response = await searchApi.searchTv({ query, page });
    const results = (response.results || []).map((t) => mapTmdbTvToCard(t));
    return {
      results,
      currentPage: response.page || page,
      totalPages: response.total_pages || 1,
      totalResults: response.total_results || results.length,
    };
  }
  const response = await searchApi.searchMulti({ query, page });
  const raw = response.results || [];
  const results = raw.reduce<MediaCardModel[]>((acc, item) => {
    const mediaType = (item as { media_type?: string }).media_type;
    if (mediaType === 'person') return acc;
    if (mediaType === 'tv' || 'first_air_date' in item) {
      acc.push(mapTmdbTvToCard(item as TMDBTvShow));
    } else if (mediaType === 'movie' || 'title' in item) {
      acc.push(mapTmdbMovieToCard(item as TMDBMovie));
    }
    return acc;
  }, []);
  return {
    results,
    currentPage: response.page || page,
    totalPages: response.total_pages || 1,
    totalResults: response.total_results || results.length,
  };
}

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
    if (type === 'anime') {
      if (query.length < 2) {
        return NextResponse.json({
          success: true,
          data: [],
          page: 1,
          totalPages: 1,
          totalResults: 0,
        });
      }
      const { results, pageInfo } = await searchAniList(query, page);
      return NextResponse.json(
        {
          success: true,
          data: results,
          page: pageInfo.currentPage,
          totalPages: pageInfo.lastPage,
          totalResults: pageInfo.total,
          hasNextPage: pageInfo.hasNextPage,
        },
        { headers: ANIME_CACHE_HEADERS }
      );
    }

    if (type === 'all') {
      const [tmdbSettled, animeSettled] = await Promise.allSettled([
        fetchTmdbPage(query, 'all', page),
        query.length >= 2 ? searchAniList(query, page) : Promise.resolve(null),
      ]);

      const tmdb =
        tmdbSettled.status === 'fulfilled'
          ? tmdbSettled.value
          : { results: [], currentPage: page, totalPages: page, totalResults: 0 };

      const animeResults =
        animeSettled.status === 'fulfilled' && animeSettled.value
          ? animeSettled.value.results
          : [];
      const animeInfo =
        animeSettled.status === 'fulfilled' && animeSettled.value
          ? animeSettled.value.pageInfo
          : { currentPage: page, lastPage: page, hasNextPage: false, total: 0 };

      const merged = [...tmdb.results, ...animeResults];
      const totalPages = Math.max(tmdb.totalPages, animeInfo.lastPage);
      const totalResults = tmdb.totalResults + animeInfo.total;
      const hasNextPage = page < totalPages;

      return NextResponse.json(
        {
          success: true,
          data: merged,
          page,
          totalPages,
          totalResults,
          hasNextPage,
        },
        { headers: CACHE_HEADERS }
      );
    }

    const tmdb = await fetchTmdbPage(query, type, page);
    return NextResponse.json(
      {
        success: true,
        data: tmdb.results,
        page: tmdb.currentPage,
        totalPages: tmdb.totalPages,
        totalResults: tmdb.totalResults,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[Search Route] Search failed:', error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}