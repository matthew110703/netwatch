import type { MetadataRoute } from 'next';
import { moviesApi, trendingApi, tvApi } from '@/lib/api';
import { absoluteUrl, dedupeMediaById } from '@/lib/seo';
import { getTmdbImageUrl } from '@/lib/tmdb-image';
import { TMDBMovie, TMDBTvShow } from '@/lib/types';

export const revalidate = 3600;

function resolveLastModified(rawDate: string | undefined, fallback: Date): Date {
  if (!rawDate) return fallback;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: absoluteUrl('/movies'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/tv'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  try {
    const [
      trendingRes,
      popularMoviesRes,
      topRatedMoviesRes,
      nowPlayingRes,
      popularTvRes,
      topRatedTvRes,
      onTheAirTvRes,
    ] = await Promise.allSettled([
      trendingApi.getTrendingMovies('week'),
      moviesApi.getPopular(),
      moviesApi.getTopRated(),
      moviesApi.getNowPlaying(),
      tvApi.getPopular(),
      tvApi.getTopRated(),
      tvApi.getOnTheAir(),
    ]);

    const extractResults = <T>(
      settled: PromiseSettledResult<{ results?: T[] }>
    ): T[] =>
      settled.status === 'fulfilled' && Array.isArray(settled.value.results)
        ? settled.value.results
        : [];

    const uniqueMovies = dedupeMediaById<TMDBMovie>(
      [
        extractResults(trendingRes),
        extractResults(popularMoviesRes),
        extractResults(nowPlayingRes),
        extractResults(topRatedMoviesRes),
      ],
      100
    );

    const uniqueTv = dedupeMediaById<TMDBTvShow>(
      [
        extractResults(popularTvRes),
        extractResults(onTheAirTvRes),
        extractResults(topRatedTvRes),
      ],
      100
    );

    for (const movie of uniqueMovies) {
      const artwork = movie.backdrop_path || movie.poster_path;
      entries.push({
        url: absoluteUrl(`/movie/${movie.id}`),
        lastModified: resolveLastModified(movie.release_date, now),
        changeFrequency: 'weekly',
        priority: 0.8,
        ...(artwork ? { images: [getTmdbImageUrl(artwork, 'w780')] } : {}),
      });
    }

    for (const show of uniqueTv) {
      const artwork = show.backdrop_path || show.poster_path;
      entries.push({
        url: absoluteUrl(`/tv/${show.id}`),
        lastModified: resolveLastModified(show.first_air_date, now),
        changeFrequency: 'weekly',
        priority: 0.8,
        ...(artwork ? { images: [getTmdbImageUrl(artwork, 'w780')] } : {}),
      });
    }
  } catch (error) {
    console.warn('[Sitemap] Falling back to static entries:', error);
  }

  return entries;
}
