import React, { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WatchViewContainer } from '@/modules/media-detail/WatchViewContainer';
import { JsonLd } from '@/components/JsonLd';
import {
  MediaItem,
  Episode,
  CastMember,
  MediaCardModel,
  TMDBMovieDetails,
  TMDBTvDetails,
} from '@/lib/types';
import { moviesApi, streamingApi, tvApi, withFallback } from '@/lib/api';
import { getTmdbImageUrl, mapTmdbMovieToCard, mapTmdbTvToCard } from '@/lib/tmdb-image';
import {
  buildBreadcrumbJsonLd,
  buildWatchVideoJsonLd,
  SITE_NAME,
  truncateDescription,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface WatchPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
  searchParams?: Promise<{
    s?: string;
    e?: string;
  }>;
}

const getMovieCached = cache(async (numId: number): Promise<TMDBMovieDetails | null> => {
  try {
    return await moviesApi.getMovieDetails(numId);
  } catch {
    return null;
  }
});

const getTvCached = cache(async (numId: number): Promise<TMDBTvDetails | null> => {
  try {
    return await tvApi.getTvDetails(numId);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
  searchParams,
}: WatchPageProps): Promise<Metadata> {
  const { type, id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const numId = Number(id);

  if ((type !== 'movie' && type !== 'tv') || !Number.isInteger(numId) || numId <= 0) {
    return {
      title: 'Title Not Found',
      description: 'Requested stream could not be found on Netwatch.',
      robots: { index: false, follow: false },
    };
  }

  if (type === 'tv') {
    const tv = await getTvCached(numId);
    if (!tv) {
      return {
        title: 'Series Not Found',
        description: 'Requested stream could not be found on Netwatch.',
        robots: { index: false, follow: false },
      };
    }
    const season = Math.max(1, parseInt(resolvedSearchParams?.s || '1', 10) || 1);
    const episode = Math.max(1, parseInt(resolvedSearchParams?.e || '1', 10) || 1);
    const canonicalPath =
      season > 1 || episode > 1 ? `/watch/tv/${numId}?s=${season}&e=${episode}` : `/watch/tv/${numId}`;
    const watchTitle = `Watch ${tv.name} S${season}E${episode}`;
    const description = truncateDescription(
      tv.overview,
      `Stream ${tv.name} Season ${season} Episode ${episode} with multi-language subtitles on ${SITE_NAME}.`
    );
    const ogImageUrl = tv.backdrop_path
      ? getTmdbImageUrl(tv.backdrop_path, 'w1280')
      : tv.poster_path
        ? getTmdbImageUrl(tv.poster_path, 'w500')
        : undefined;

    return {
      title: watchTitle,
      description,
      alternates: { canonical: canonicalPath },
      openGraph: {
        title: `${watchTitle} | ${SITE_NAME}`,
        description,
        type: 'video.other',
        url: canonicalPath,
        siteName: SITE_NAME,
        ...(ogImageUrl
          ? {
              images: [
                {
                  url: ogImageUrl,
                  width: tv.backdrop_path ? 1280 : 500,
                  height: tv.backdrop_path ? 720 : 750,
                  alt: tv.name,
                },
              ],
            }
          : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${watchTitle} | ${SITE_NAME}`,
        description,
        ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
      },
    };
  }

  const movie = await getMovieCached(numId);
  if (!movie) {
    return {
      title: 'Movie Not Found',
      description: 'Requested stream could not be found on Netwatch.',
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/watch/movie/${numId}`;
  const watchTitle = `Watch ${movie.title}`;
  const description = truncateDescription(
    movie.overview,
    `Stream ${movie.title} online with multi-language subtitles on ${SITE_NAME}.`
  );
  const ogImageUrl = movie.backdrop_path
    ? getTmdbImageUrl(movie.backdrop_path, 'w1280')
    : movie.poster_path
      ? getTmdbImageUrl(movie.poster_path, 'w500')
      : undefined;

  return {
    title: watchTitle,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${watchTitle} | ${SITE_NAME}`,
      description,
      type: 'video.other',
      url: canonicalPath,
      siteName: SITE_NAME,
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                width: movie.backdrop_path ? 1280 : 500,
                height: movie.backdrop_path ? 720 : 750,
                alt: movie.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${watchTitle} | ${SITE_NAME}`,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { type, id } = resolvedParams;
  const numId = Number(id);

  if ((type !== 'movie' && type !== 'tv') || !Number.isInteger(numId) || numId <= 0) {
    notFound();
  }

  const targetSeason = Math.max(1, parseInt(resolvedSearchParams?.s || '1', 10) || 1);
  const targetEpisode = Math.max(1, parseInt(resolvedSearchParams?.e || '1', 10) || 1);

  let liveItem: MediaItem | null = null;
  let liveCast: CastMember[] = [];
  let liveEpisodes: Episode[] = [];
  let recommendations: MediaCardModel[] = [];

  if (type === 'tv') {
    const [
      tvDetails,
      { data: seasonData },
      { data: episodeDetails },
      { data: recRaw },
      { data: resolvedStream },
    ] = await Promise.all([
      getTvCached(numId),
      withFallback(tvApi.getSeasonDetails(numId, targetSeason), {
        id: targetSeason,
        name: `Season ${targetSeason}`,
        season_number: targetSeason,
        episode_count: 0,
        episodes: [],
      }),
      withFallback(tvApi.getEpisodeDetails(numId, targetSeason, targetEpisode), null),
      withFallback(tvApi.getRecommendations(numId), {
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      }),
      withFallback(
        streamingApi.resolveStream({
          type: 'tv',
          tmdbId: numId,
          season: targetSeason,
          episode: targetEpisode,
        }),
        null
      ),
    ]);

    if (!tvDetails) {
      notFound();
    }

    const activeServers =
      resolvedStream?.availableServers && resolvedStream.availableServers.length > 0
        ? resolvedStream.availableServers
        : episodeDetails?.servers && episodeDetails.servers.length > 0
          ? episodeDetails.servers
          : tvDetails.servers;

    liveItem = {
      id: tvDetails.id,
      title: tvDetails.name,
      name: tvDetails.name,
      overview: tvDetails.overview || '',
      posterUrl: tvDetails.poster_path ? getTmdbImageUrl(tvDetails.poster_path, 'w500') : '',
      backdropUrl: tvDetails.backdrop_path
        ? getTmdbImageUrl(tvDetails.backdrop_path, 'w1280')
        : '',
      vote_average: tvDetails.vote_average || 0,
      release_date: tvDetails.first_air_date,
      first_air_date: tvDetails.first_air_date,
      media_type: 'tv',
      genres: tvDetails.genres,
      number_of_seasons: tvDetails.number_of_seasons,
      number_of_episodes: tvDetails.number_of_episodes,
      servers: activeServers,
      seasons: (tvDetails.seasons || [])
        .filter((s) => s.season_number > 0)
        .map((s) => ({
          season_number: s.season_number,
          name: s.name,
          episode_count: s.episode_count,
        })),
    };

    liveEpisodes = (seasonData?.episodes || []).map((ep) => ({
      id: ep.id,
      name: ep.name,
      episode_number: ep.episode_number,
      season_number: ep.season_number ?? targetSeason,
      overview: ep.overview || '',
      still_path: ep.still_path,
      stillUrl: ep.still_path ? getTmdbImageUrl(ep.still_path, 'w500') : undefined,
      air_date: ep.air_date,
      runtime: ep.runtime || undefined,
    }));

    liveCast = (tvDetails.credits?.cast || []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || '',
      profile_path: c.profile_path,
      profileUrl: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w300') : '',
    }));

    recommendations = (recRaw.results || []).map((show) => mapTmdbTvToCard(show));
  } else {
    const [movieDetails, { data: recRaw }, { data: resolvedStream }] = await Promise.all([
      getMovieCached(numId),
      withFallback(moviesApi.getRecommendations(numId), {
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      }),
      withFallback(
        streamingApi.resolveStream({
          type: 'movie',
          tmdbId: numId,
        }),
        null
      ),
    ]);

    if (!movieDetails) {
      notFound();
    }

    const activeServers =
      resolvedStream?.availableServers && resolvedStream.availableServers.length > 0
        ? resolvedStream.availableServers
        : movieDetails.servers;

    liveItem = {
      id: movieDetails.id,
      title: movieDetails.title,
      overview: movieDetails.overview || '',
      posterUrl: movieDetails.poster_path ? getTmdbImageUrl(movieDetails.poster_path, 'w500') : '',
      backdropUrl: movieDetails.backdrop_path
        ? getTmdbImageUrl(movieDetails.backdrop_path, 'w1280')
        : '',
      vote_average: movieDetails.vote_average || 0,
      release_date: movieDetails.release_date,
      media_type: 'movie',
      genres: movieDetails.genres,
      runtime: movieDetails.runtime || undefined,
      servers: activeServers,
    };

    liveCast = (movieDetails.credits?.cast || []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || '',
      profile_path: c.profile_path,
      profileUrl: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w300') : '',
    }));

    recommendations = (recRaw.results || []).map((movie) => mapTmdbMovieToCard(movie));
  }

  return (
    <>
      <JsonLd
        data={buildWatchVideoJsonLd({
          type,
          id: numId,
          title: liveItem.title || liveItem.name || `Title #${numId}`,
          description: liveItem.overview,
          thumbnailUrl: liveItem.backdropUrl || liveItem.posterUrl,
          uploadDate: liveItem.release_date || liveItem.first_air_date,
          durationMinutes: liveItem.runtime,
          season: type === 'tv' ? targetSeason : undefined,
          episode: type === 'tv' ? targetEpisode : undefined,
        })}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: type === 'tv' ? 'TV Shows' : 'Movies', path: type === 'tv' ? '/tv' : '/movies' },
          { name: liveItem.title || liveItem.name || `Title #${numId}`, path: `/${type}/${numId}` },
          {
            name: type === 'tv' ? `Watch S${targetSeason}E${targetEpisode}` : 'Watch',
            path: `/watch/${type}/${numId}`,
          },
        ])}
      />
      <WatchViewContainer
        initialItem={liveItem}
        mediaType={type}
        id={numId}
        initialSeason={targetSeason}
        initialEpisode={targetEpisode}
        cast={liveCast.length > 0 ? liveCast : undefined}
        episodes={liveEpisodes.length > 0 ? liveEpisodes : undefined}
        recommendations={recommendations}
      />
    </>
  );
}
