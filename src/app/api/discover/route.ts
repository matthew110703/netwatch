import { NextRequest, NextResponse } from 'next/server';
import { discoverApi } from '@/lib/api';
import { mapTmdbMovieToCard, mapTmdbTvToCard } from '@/lib/tmdb-image';
import { MediaCardModel } from '@/lib/types';

const CACHE_HEADER = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'movie';
  const genreId = searchParams.get('genreId')?.trim() || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  try {
    const withGenres = genreId && genreId !== '0' ? genreId : undefined;
    let results: MediaCardModel[] = [];

    if (type === 'tv') {
      const res = await discoverApi.discoverTv({ page, with_genres: withGenres });
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
        discoverApi.discoverMovies({ page, with_genres: withGenres }),
        discoverApi.discoverTv({ page, with_genres: withGenres }),
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

    const res = await discoverApi.discoverMovies({ page, with_genres: withGenres });
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
