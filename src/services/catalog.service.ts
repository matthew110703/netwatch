import {
  trendingApi,
  moviesApi,
  tvApi,
  genresApi,
} from '@/lib/api';
import { mapTmdbMovieToCard, mapTmdbTvToCard } from '@/lib/tmdb-image';
import { MediaCardModel, TMDBGenre, TMDBVideo } from '@/lib/types';

export interface HomeFeedData {
  billboardItem: MediaCardModel | null;
  trendingItems: MediaCardModel[];
  topPicksItems: MediaCardModel[];
  popularTvItems: MediaCardModel[];
  topRatedItems: MediaCardModel[];
  genres: TMDBGenre[];
  isLive: boolean;
}

function pickYoutubeTrailerKey(videos?: TMDBVideo[]): string | undefined {
  if (!videos || videos.length === 0) return undefined;
  const trailer =
    videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
    videos.find((v) => v.site === 'YouTube');
  return trailer?.key;
}

async function resolveFirstTrailer(
  candidates: MediaCardModel[],
  fetcher: (id: number) => Promise<{ videos?: { results?: TMDBVideo[] } }>
): Promise<{ candidate: MediaCardModel; trailerKey: string } | null> {
  const pool = candidates.filter((c) => Boolean(c.backdropUrl)).slice(0, 5);
  if (pool.length === 0) return null;

  const settled = await Promise.allSettled(
    pool.map(async (candidate) => {
      const details = await fetcher(candidate.id);
      const key = pickYoutubeTrailerKey(details.videos?.results);
      if (!key) throw new Error('No trailer');
      return { candidate, trailerKey: key };
    })
  );

  for (const res of settled) {
    if (res.status === 'fulfilled') {
      return res.value;
    }
  }
  return null;
}

export async function getHomeFeedData(): Promise<HomeFeedData> {
  try {
    const [trendingRes, nowPlayingRes, popularTvRes, topRatedRes, genresRes] =
      await Promise.allSettled([
        trendingApi.getTrendingMovies('day'),
        moviesApi.getNowPlaying(),
        tvApi.getPopular(),
        moviesApi.getTopRated(),
        genresApi.getMovieGenres(),
      ]);

    const trendingRaw =
      trendingRes.status === 'fulfilled' && trendingRes.value.results
        ? trendingRes.value.results
        : [];
    const trendingItems: MediaCardModel[] = trendingRaw
      .slice(0, 10)
      .map((movie, index) => mapTmdbMovieToCard(movie, index + 1));

    const nowPlayingRaw =
      nowPlayingRes.status === 'fulfilled' && nowPlayingRes.value.results
        ? nowPlayingRes.value.results
        : [];
    const topPicksItems: MediaCardModel[] = nowPlayingRaw
      .slice(0, 10)
      .map((movie) => mapTmdbMovieToCard(movie));

    const tvRaw =
      popularTvRes.status === 'fulfilled' && popularTvRes.value.results
        ? popularTvRes.value.results
        : [];
    const popularTvItems: MediaCardModel[] = tvRaw
      .slice(0, 10)
      .map((tv) => mapTmdbTvToCard(tv));

    const topRatedRaw =
      topRatedRes.status === 'fulfilled' && topRatedRes.value.results
        ? topRatedRes.value.results
        : [];
    const topRatedItems: MediaCardModel[] = topRatedRaw
      .slice(0, 10)
      .map((movie) => mapTmdbMovieToCard(movie));

    const genresRaw =
      genresRes.status === 'fulfilled' && Array.isArray(genresRes.value)
        ? genresRes.value
        : [];
    const genres: TMDBGenre[] = [
      { id: 0, name: 'All Genres' },
      ...genresRaw.filter((g) => g.name !== 'All Genres').slice(0, 10),
    ];

    const candidates = [...trendingItems, ...topPicksItems];
    const trailerHit = await resolveFirstTrailer(candidates, (id) =>
      moviesApi.getMovieDetails(id, { append_to_response: 'videos' })
    );

    let billboardItem: MediaCardModel | null = null;
    if (trailerHit) {
      billboardItem = {
        ...trailerHit.candidate,
        format: 'IMAX ENHANCED • 4K HDR',
        badge: 'FEATURED PREMIERE',
        trailerKey: trailerHit.trailerKey,
      };
    } else if (candidates[0]) {
      billboardItem = {
        ...candidates[0],
        format: 'IMAX ENHANCED • 4K HDR',
        badge: 'FEATURED PREMIERE',
      };
    }

    return {
      billboardItem,
      trendingItems,
      topPicksItems,
      popularTvItems,
      topRatedItems,
      genres,
      isLive: trendingRes.status === 'fulfilled',
    };
  } catch (error) {
    console.error('[Catalog Service] Error loading home feed:', error);
    return {
      billboardItem: null,
      trendingItems: [],
      topPicksItems: [],
      popularTvItems: [],
      topRatedItems: [],
      genres: [{ id: 0, name: 'All Genres' }],
      isLive: false,
    };
  }
}

export interface MoviesFeedData {
  spotlightMovie: MediaCardModel | null;
  popularMovies: MediaCardModel[];
  topRatedMovies: MediaCardModel[];
  nowPlayingMovies: MediaCardModel[];
  genres: TMDBGenre[];
}

export async function getMoviesFeedData(): Promise<MoviesFeedData> {
  try {
    const [popularRes, topRatedRes, nowPlayingRes, genresRes] = await Promise.allSettled([
      moviesApi.getPopular(),
      moviesApi.getTopRated(),
      moviesApi.getNowPlaying(),
      genresApi.getMovieGenres(),
    ]);

    const popularMovies: MediaCardModel[] =
      popularRes.status === 'fulfilled' && popularRes.value.results
        ? popularRes.value.results.slice(0, 12).map((m) => mapTmdbMovieToCard(m))
        : [];

    const topRatedMovies: MediaCardModel[] =
      topRatedRes.status === 'fulfilled' && topRatedRes.value.results
        ? topRatedRes.value.results.slice(0, 12).map((m) => mapTmdbMovieToCard(m))
        : [];

    const nowPlayingMovies: MediaCardModel[] =
      nowPlayingRes.status === 'fulfilled' && nowPlayingRes.value.results
        ? nowPlayingRes.value.results.slice(0, 12).map((m) => mapTmdbMovieToCard(m))
        : [];

    const genres: TMDBGenre[] =
      genresRes.status === 'fulfilled' && Array.isArray(genresRes.value)
        ? [{ id: 0, name: 'All Genres' }, ...genresRes.value.slice(0, 10)]
        : [{ id: 0, name: 'All Genres' }];

    const trailerHit = await resolveFirstTrailer(popularMovies, (id) =>
      moviesApi.getMovieDetails(id, { append_to_response: 'videos' })
    );

    let spotlightMovie: MediaCardModel | null = null;
    if (trailerHit) {
      spotlightMovie = {
        ...trailerHit.candidate,
        format: 'CINEMATIC 4K HDR',
        badge: 'TOP FEATURE FILM',
        trailerKey: trailerHit.trailerKey,
      };
    } else if (popularMovies[0]) {
      spotlightMovie = {
        ...popularMovies[0],
        format: 'CINEMATIC 4K HDR',
        badge: 'TOP FEATURE FILM',
      };
    }

    return {
      spotlightMovie,
      popularMovies,
      topRatedMovies,
      nowPlayingMovies,
      genres,
    };
  } catch (error) {
    console.error('[Catalog Service] Error loading movies feed:', error);
    return {
      spotlightMovie: null,
      popularMovies: [],
      topRatedMovies: [],
      nowPlayingMovies: [],
      genres: [{ id: 0, name: 'All Genres' }],
    };
  }
}

export interface TvFeedData {
  spotlightTv: MediaCardModel | null;
  popularTv: MediaCardModel[];
  topRatedTv: MediaCardModel[];
  onTheAirTv: MediaCardModel[];
  genres: TMDBGenre[];
}

export async function getTvFeedData(): Promise<TvFeedData> {
  try {
    const [popularRes, topRatedRes, onTheAirRes, genresRes] = await Promise.allSettled([
      tvApi.getPopular(),
      tvApi.getTopRated(),
      tvApi.getOnTheAir(),
      genresApi.getTvGenres(),
    ]);

    const popularTv: MediaCardModel[] =
      popularRes.status === 'fulfilled' && popularRes.value.results
        ? popularRes.value.results.slice(0, 12).map((t) => mapTmdbTvToCard(t))
        : [];

    const topRatedTv: MediaCardModel[] =
      topRatedRes.status === 'fulfilled' && topRatedRes.value.results
        ? topRatedRes.value.results.slice(0, 12).map((t) => mapTmdbTvToCard(t))
        : [];

    const onTheAirTv: MediaCardModel[] =
      onTheAirRes.status === 'fulfilled' && onTheAirRes.value.results
        ? onTheAirRes.value.results.slice(0, 12).map((t) => mapTmdbTvToCard(t))
        : [];

    const genres: TMDBGenre[] =
      genresRes.status === 'fulfilled' && Array.isArray(genresRes.value)
        ? [{ id: 0, name: 'All Genres' }, ...genresRes.value.slice(0, 10)]
        : [{ id: 0, name: 'All Genres' }];

    const trailerHit = await resolveFirstTrailer(popularTv, (id) =>
      tvApi.getTvDetails(id, { append_to_response: 'videos' })
    );

    let spotlightTv: MediaCardModel | null = null;
    if (trailerHit) {
      spotlightTv = {
        ...trailerHit.candidate,
        format: 'DOLBY VISION • 4K',
        badge: 'TRENDING SERIES',
        trailerKey: trailerHit.trailerKey,
      };
    } else {
      const fallbackTv = popularTv.find((t) => t.backdropUrl) || popularTv[0] || null;
      if (fallbackTv) {
        spotlightTv = {
          ...fallbackTv,
          format: 'DOLBY VISION • 4K',
          badge: 'TRENDING SERIES',
        };
      }
    }

    return {
      spotlightTv,
      popularTv,
      topRatedTv,
      onTheAirTv,
      genres,
    };
  } catch (error) {
    console.error('[Catalog Service] Error loading TV feed:', error);
    return {
      spotlightTv: null,
      popularTv: [],
      topRatedTv: [],
      onTheAirTv: [],
      genres: [{ id: 0, name: 'All Genres' }],
    };
  }
}
