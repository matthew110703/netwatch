import {
  trendingApi,
  moviesApi,
  tvApi,
  genresApi,
  discoverApi,
} from '@/lib/api';
import {
  LANGUAGE_RAIL_CONFIG,
  REGIONAL_CHART_DISCOVER_QUERY,
} from '@/lib/catalog.constants';
import { DEFAULT_REGION, getRegionLabel } from '@/lib/region';
import { mapTmdbMovieToCard, mapTmdbTvToCard } from '@/lib/tmdb-image';
import {
  MediaCardModel,
  TMDBGenre,
  TMDBMovie,
  TMDBPaginatedResponse,
  TMDBTvShow,
  TMDBVideo,
} from '@/lib/types';
import { strings } from '@/app/strings';

export interface LanguageRailData {
  code: string;
  label: string;
  title: string;
  subtitle: string;
  items: MediaCardModel[];
}

export interface HomeFeedData {
  billboardItem: MediaCardModel | null;
  trendingItems: MediaCardModel[];
  topPicksItems: MediaCardModel[];
  popularTvItems: MediaCardModel[];
  topRatedItems: MediaCardModel[];
  region: string;
  regionLabel: string;
  regionTopMovies: MediaCardModel[];
  regionTopTv: MediaCardModel[];
  languageRails: LanguageRailData[];
  genres: TMDBGenre[];
  isLive: boolean;
}

function emptyHomeFeedData(region: string = DEFAULT_REGION): HomeFeedData {
  return {
    billboardItem: null,
    trendingItems: [],
    topPicksItems: [],
    popularTvItems: [],
    topRatedItems: [],
    region,
    regionLabel: getRegionLabel(region),
    regionTopMovies: [],
    regionTopTv: [],
    languageRails: [],
    genres: [{ id: 0, name: 'All Genres' }],
    isLive: false,
  };
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

export async function getHomeFeedData(region: string): Promise<HomeFeedData> {
  const regionCode = region.trim().toUpperCase() || DEFAULT_REGION;
  const regionLabel = getRegionLabel(regionCode);

  try {
    const regionalDiscoverQuery = {
      watch_region: regionCode,
      ...REGIONAL_CHART_DISCOVER_QUERY,
    };

    const settled = await Promise.allSettled([
      trendingApi.getTrendingMovies('day'),
      moviesApi.getNowPlaying(),
      tvApi.getPopular(),
      moviesApi.getTopRated(),
      genresApi.getMovieGenres(),
      discoverApi.discoverMovies(regionalDiscoverQuery),
      discoverApi.discoverTv(regionalDiscoverQuery),
      ...LANGUAGE_RAIL_CONFIG.map((lang) =>
        discoverApi.discoverMovies({
          with_original_language: lang.code,
          sort_by: 'popularity.desc',
          'vote_count.gte': 50,
        })
      ),
    ]);

    const trendingRes = settled[0];
    const nowPlayingRes = settled[1];
    const popularTvRes = settled[2];
    const topRatedRes = settled[3];
    const genresRes = settled[4];
    const regionMoviesRes = settled[5];
    const regionTvRes = settled[6];
    const languageResList = settled.slice(7) as PromiseSettledResult<
      TMDBPaginatedResponse<TMDBMovie>
    >[];

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

    const regionTopMovies: MediaCardModel[] =
      regionMoviesRes.status === 'fulfilled' && regionMoviesRes.value.results
        ? regionMoviesRes.value.results
            .slice(0, 10)
            .map((movie: TMDBMovie, index: number) => mapTmdbMovieToCard(movie, index + 1))
        : [];

    const regionTopTv: MediaCardModel[] =
      regionTvRes.status === 'fulfilled' && regionTvRes.value.results
        ? regionTvRes.value.results
            .slice(0, 10)
            .map((tv: TMDBTvShow, index: number) => mapTmdbTvToCard(tv, index + 1))
        : [];

    const languageRails: LanguageRailData[] = LANGUAGE_RAIL_CONFIG.map((lang, index) => {
      const res = languageResList[index];
      const copy =
        strings.languageRails[lang.code as keyof typeof strings.languageRails];
      const items =
        res?.status === 'fulfilled' && res.value.results
          ? res.value.results.slice(0, 10).map((movie: TMDBMovie) => mapTmdbMovieToCard(movie))
          : [];
      return {
        code: lang.code,
        label: lang.label,
        title: copy?.title ?? `${lang.label} picks`,
        subtitle: copy?.subtitle ?? '',
        items,
      };
    }).filter((rail) => rail.items.length > 0);

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
      region: regionCode,
      regionLabel,
      regionTopMovies,
      regionTopTv,
      languageRails,
      genres,
      isLive: trendingRes.status === 'fulfilled',
    };
  } catch (error) {
    console.error('[Catalog Service] Error loading home feed:', error);
    return emptyHomeFeedData(regionCode);
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

function mapTvResults(results: unknown): MediaCardModel[] {
  if (!Array.isArray(results)) return [];
  return results.reduce<MediaCardModel[]>((acc, t) => {
    try {
      acc.push(mapTmdbTvToCard(t as Parameters<typeof mapTmdbTvToCard>[0]));
    } catch (err) {
      console.warn('[Catalog Service] Skipped TV card mapping:', err);
    }
    return acc;
  }, []).slice(0, 12);
}

export async function getTvFeedData(): Promise<TvFeedData> {
  const [popularRes, topRatedRes, onTheAirRes, genresRes] = await Promise.allSettled([
    tvApi.getPopular(),
    tvApi.getTopRated(),
    tvApi.getOnTheAir(),
    genresApi.getTvGenres(),
  ]);

  if (popularRes.status === 'rejected') {
    console.error('[Catalog Service] TV popular rail failed:', popularRes.reason);
  }
  if (topRatedRes.status === 'rejected') {
    console.error('[Catalog Service] TV top-rated rail failed:', topRatedRes.reason);
  }
  if (onTheAirRes.status === 'rejected') {
    console.error('[Catalog Service] TV on-the-air rail failed:', onTheAirRes.reason);
  }

  const popularTv: MediaCardModel[] =
    popularRes.status === 'fulfilled' && popularRes.value.results
      ? mapTvResults(popularRes.value.results)
      : [];

  const topRatedTv: MediaCardModel[] =
    topRatedRes.status === 'fulfilled' && topRatedRes.value.results
      ? mapTvResults(topRatedRes.value.results)
      : [];

  const onTheAirTv: MediaCardModel[] =
    onTheAirRes.status === 'fulfilled' && onTheAirRes.value.results
      ? mapTvResults(onTheAirRes.value.results)
      : [];

  const genres: TMDBGenre[] =
    genresRes.status === 'fulfilled' && Array.isArray(genresRes.value)
      ? [{ id: 0, name: 'All Genres' }, ...genresRes.value.slice(0, 10)]
      : [{ id: 0, name: 'All Genres' }];

  let spotlightTv: MediaCardModel | null = null;
  try {
    const trailerHit = await resolveFirstTrailer(popularTv, (id) =>
      tvApi.getTvDetails(id, { append_to_response: 'videos' })
    );

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
  } catch (error) {
    console.warn('[Catalog Service] TV spotlight trailer skipped:', error);
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
}
