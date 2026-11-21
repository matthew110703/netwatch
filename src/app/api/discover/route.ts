import { NextRequest, NextResponse } from 'next/server';
import { discoverApi, DiscoverQuery } from '@/lib/api';
import { mapTmdbMovieToCard, mapTmdbTvToCard } from '@/lib/tmdb-image';
import { MediaCardModel } from '@/lib/types';
import { normalizeRegionCode } from '@/lib/region';

const CACHE_HEADER = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' };

function buildDiscoverQuery(searchParams: URLSearchParams, page: number): DiscoverQuery {
  const genreId = searchParams.get('genreId')?.trim() || '';
  const withGenres = genreId && genreId !== '0' ? genreId : undefined;
  const voteGte = searchParams.get('vote_count.gte');
  const voteLte = searchParams.get('vote_count.lte');
  const watchRegion = normalizeRegionCode(searchParams.get('watch_region'));
  const region = normalizeRegionCode(searchParams.get('region'));

  return {
    page,
    language: searchParams.get('language')?.trim() || undefined,
    with_genres: withGenres,
    sort_by: searchParams.get('sort_by')?.trim() || undefined,
    region: region ?? undefined,
    watch_region: watchRegion ?? undefined,
    with_original_language: searchParams.get('with_original_language')?.trim() || undefined,
    with_watch_monetization_types:
      searchParams.get('with_watch_monetization_types')?.trim() || undefined,
    'vote_count.gte': voteGte != null && voteGte !== '' ? Number(voteGte) : undefined,
    'vote_count.lte': voteLte != null && voteLte !== '' ? Number(voteLte) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'movie';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const discoverQuery = buildDiscoverQuery(searchParams, page);

  try {
    let results: MediaCardModel[] = [];

    if (type === 'tv') {
      const res = await discoverApi.discoverTv(discoverQuery);
      results = (res.results || []).map((t) => mapTmdbTvToCard(t));
      return NextResponse.json(
        {
          success: true,
          data: results,
          page: res.page,
          totalPages: res.total_pages,
        },
        { headers: CACHE_HEADER }
      );
    }

    if (type === 'all') {
      const [movieRes, tvRes] = await Promise.allSettled([
        discoverApi.discoverMovies(discoverQuery),
        discoverApi.discoverTv(discoverQuery),
      ]);
      const movieCards =
        movieRes.status === 'fulfilled'
          ? (movieRes.value.results || []).slice(0, 12).map((m) => mapTmdbMovieToCard(m))
          : [];
      const tvCards =
        tvRes.status === 'fulfilled'
          ? (tvRes.value.results || []).slice(0, 8).map((t) => mapTmdbTvToCard(t))
          : [];
      results = [...movieCards, ...tvCards];
      return NextResponse.json(
        {
          success: true,
          data: results,
          page,
        },
        { headers: CACHE_HEADER }
      );
    }

    const res = await discoverApi.discoverMovies(discoverQuery);
    results = (res.results || []).map((m) => mapTmdbMovieToCard(m));
    return NextResponse.json(
      {
        success: true,
        data: results,
        page: res.page,
        totalPages: res.total_pages,
      },
      { headers: CACHE_HEADER }
    );
  } catch (error) {
    console.warn('[Discover Route] Failed to query catalog:', error);
    return NextResponse.json({ success: false, data: [] }, { status: 502 });
  }
}
