import { TMDBMovie, TMDBTvShow } from './types';

export const SITE_NAME = 'Netwatch';
export const SITE_TITLE = 'Netwatch | Elite Cinematic Streaming';
export const SITE_DESCRIPTION =
  'Stream trending movies and binge-worthy TV series in high fidelity with multi-source playback, subtitles, and personalized watchlists on Netwatch.';

export const SITE_KEYWORDS = [
  'Netwatch',
  'movies',
  'tv shows',
  'streaming',
  'cinema',
  '4K HDR',
  'HLS streaming',
  'subtitles',
  'watchlist',
];

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';

  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin.replace(/\/+$/, '');
  } catch {
    return 'http://localhost:3000';
  }
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === '/') return base;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function truncateDescription(
  text: string | undefined | null,
  fallback: string,
  maxLen = 160
): string {
  const source = (text || '').replace(/\s+/g, ' ').trim();
  if (!source) return fallback;
  if (source.length <= maxLen) return source;

  const sliced = source.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const cutoff = lastSpace > Math.floor(maxLen * 0.6) ? lastSpace : maxLen - 1;
  return `${sliced.slice(0, cutoff).trimEnd()}…`;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function buildWebsiteJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/netwatch-logo.png'),
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildItemListJsonLd(
  name: string,
  items: Array<{ name: string; path: string; image?: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: Math.min(items.length, 20),
    itemListElement: items.slice(0, 20).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}

function buildRatingBlock(voteAverage?: number, voteCount?: number) {
  if (!voteAverage || voteAverage <= 0) return undefined;
  return {
    '@type': 'AggregateRating',
    ratingValue: Number(voteAverage.toFixed(1)),
    bestRating: 10,
    worstRating: 0,
    ...(voteCount && voteCount > 0 ? { ratingCount: voteCount } : {}),
  };
}

export function buildMovieJsonLd(movie: {
  id: number;
  title: string;
  overview?: string;
  backdropUrl?: string;
  posterUrl?: string;
  releaseDate?: string;
  runtime?: number | null;
  voteAverage?: number;
  voteCount?: number;
  genres?: string[];
  cast?: string[];
}) {
  const url = absoluteUrl(`/movie/${movie.id}`);
  const images = [movie.backdropUrl, movie.posterUrl].filter(Boolean) as string[];

  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    url,
    description: truncateDescription(movie.overview, `Watch ${movie.title} on ${SITE_NAME}.`, 300),
    ...(images.length > 0 ? { image: images } : {}),
    ...(movie.releaseDate ? { datePublished: movie.releaseDate } : {}),
    ...(movie.runtime && movie.runtime > 0 ? { duration: `PT${movie.runtime}M` } : {}),
    ...(movie.genres && movie.genres.length > 0 ? { genre: movie.genres } : {}),
    ...(movie.cast && movie.cast.length > 0
      ? {
          actor: movie.cast.slice(0, 8).map((actorName) => ({
            '@type': 'Person',
            name: actorName,
          })),
        }
      : {}),
    ...(buildRatingBlock(movie.voteAverage, movie.voteCount)
      ? { aggregateRating: buildRatingBlock(movie.voteAverage, movie.voteCount) }
      : {}),
    potentialAction: {
      '@type': 'WatchAction',
      target: absoluteUrl(`/watch/movie/${movie.id}`),
    },
  };
}

export function buildTvSeriesJsonLd(tv: {
  id: number;
  name: string;
  overview?: string;
  backdropUrl?: string;
  posterUrl?: string;
  firstAirDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  voteAverage?: number;
  voteCount?: number;
  genres?: string[];
  cast?: string[];
}) {
  const url = absoluteUrl(`/tv/${tv.id}`);
  const images = [tv.backdropUrl, tv.posterUrl].filter(Boolean) as string[];

  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: tv.name,
    url,
    description: truncateDescription(tv.overview, `Stream ${tv.name} on ${SITE_NAME}.`, 300),
    ...(images.length > 0 ? { image: images } : {}),
    ...(tv.firstAirDate ? { startDate: tv.firstAirDate } : {}),
    ...(tv.numberOfSeasons && tv.numberOfSeasons > 0
      ? { numberOfSeasons: tv.numberOfSeasons }
      : {}),
    ...(tv.numberOfEpisodes && tv.numberOfEpisodes > 0
      ? { numberOfEpisodes: tv.numberOfEpisodes }
      : {}),
    ...(tv.genres && tv.genres.length > 0 ? { genre: tv.genres } : {}),
    ...(tv.cast && tv.cast.length > 0
      ? {
          actor: tv.cast.slice(0, 8).map((actorName) => ({
            '@type': 'Person',
            name: actorName,
          })),
        }
      : {}),
    ...(buildRatingBlock(tv.voteAverage, tv.voteCount)
      ? { aggregateRating: buildRatingBlock(tv.voteAverage, tv.voteCount) }
      : {}),
    potentialAction: {
      '@type': 'WatchAction',
      target: absoluteUrl(`/watch/tv/${tv.id}`),
    },
  };
}

export function buildWatchVideoJsonLd(params: {
  type: 'movie' | 'tv';
  id: number;
  title: string;
  description: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  durationMinutes?: number;
  season?: number;
  episode?: number;
}) {
  const isEpisodic =
    params.type === 'tv' &&
    typeof params.season === 'number' &&
    typeof params.episode === 'number';
  const watchPath = isEpisodic
    ? `/watch/tv/${params.id}?s=${params.season}&e=${params.episode}`
    : `/watch/${params.type}/${params.id}`;
  const fullName = isEpisodic
    ? `${params.title} S${params.season}E${params.episode}`
    : params.title;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: `Watch ${fullName}`,
    description: truncateDescription(
      params.description,
      `Stream ${fullName} online on ${SITE_NAME}.`,
      300
    ),
    ...(params.thumbnailUrl ? { thumbnailUrl: [params.thumbnailUrl] } : {}),
    ...(params.uploadDate ? { uploadDate: params.uploadDate } : {}),
    ...(params.durationMinutes && params.durationMinutes > 0
      ? { duration: `PT${params.durationMinutes}M` }
      : {}),
    url: absoluteUrl(watchPath),
    embedUrl: absoluteUrl(watchPath),
  };
}

export function dedupeMediaById<T extends Pick<TMDBMovie | TMDBTvShow, 'id'>>(
  lists: T[][],
  cap = 100
): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (!item || !Number.isInteger(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= cap) return out;
    }
  }
  return out;
}
