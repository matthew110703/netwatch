import React, { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { tvApi, withFallback } from '@/lib/api';
import { DetailViewLayout, EpisodeItem } from '@/components/DetailViewLayout';
import { JsonLd } from '@/components/JsonLd';
import { getTmdbImageUrl, mapTmdbTvToCard } from '@/lib/tmdb-image';
import {
  buildBreadcrumbJsonLd,
  buildTvSeriesJsonLd,
  SITE_NAME,
  truncateDescription,
} from '@/lib/seo';
import { TMDBTvDetails } from '@/lib/types';

interface TvDetailPageProps {
  params: Promise<{ id: string }>;
}

const getTvCached = cache(async (numId: number): Promise<TMDBTvDetails | null> => {
  try {
    return await tvApi.getTvDetails(numId);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: TvDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    return {
      title: 'Series Not Found',
      description: 'Requested series could not be found on Netwatch.',
      robots: { index: false, follow: false },
    };
  }

  const tv = await getTvCached(numId);
  if (!tv) {
    return {
      title: 'Series Not Found',
      description: 'Requested series could not be found on Netwatch.',
      robots: { index: false, follow: false },
    };
  }

  const year = tv.first_air_date ? tv.first_air_date.split('-')[0] : '';
  const displayTitle = year ? `${tv.name} (${year})` : tv.name;
  const description = truncateDescription(
    tv.overview,
    `Stream ${tv.name} episodes and seasons with subtitles on Netwatch.`
  );
  const ogImageUrl = tv.backdrop_path
    ? getTmdbImageUrl(tv.backdrop_path, 'w1280')
    : tv.poster_path
      ? getTmdbImageUrl(tv.poster_path, 'w500')
      : undefined;
  const canonicalPath = `/tv/${numId}`;

  return {
    title: displayTitle,
    description,
    keywords: [
      tv.name,
      ...(tv.genres || []).map((g) => g.name),
      ...(tv.credits?.cast || []).slice(0, 4).map((c) => c.name),
      SITE_NAME,
    ],
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${displayTitle} | ${SITE_NAME}`,
      description,
      type: 'video.tv_show',
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
      title: `${displayTitle} | ${SITE_NAME}`,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default async function TvDetailPage({ params }: TvDetailPageProps) {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    notFound();
  }

  const [tv, { data: seasonData }, { data: recRaw }] = await Promise.all([
    getTvCached(numId),
    withFallback(tvApi.getSeasonDetails(numId, 1), {
      id: 1,
      name: 'Season 1',
      season_number: 1,
      episode_count: 0,
      episodes: [],
    }),
    withFallback(tvApi.getRecommendations(numId), {
      page: 1,
      results: [],
      total_pages: 1,
      total_results: 0,
    }),
  ]);

  if (!tv) {
    notFound();
  }

  const episodes: EpisodeItem[] = (seasonData.episodes || []).map((ep) => ({
    id: ep.id,
    name: ep.name,
    episode_number: ep.episode_number,
    season_number: ep.season_number ?? 1,
    overview: ep.overview || '',
    stillUrl: ep.still_path ? getTmdbImageUrl(ep.still_path, 'w500') : undefined,
    runtime: ep.runtime,
  }));

  const recommendations =
    recRaw.results && recRaw.results.length > 0
      ? recRaw.results.map((show) => mapTmdbTvToCard(show))
      : [];

  const cast = (tv.credits?.cast || []).slice(0, 12).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character || '',
    profileUrl: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w300') : '',
  }));

  const backdropUrl = tv.backdrop_path ? getTmdbImageUrl(tv.backdrop_path, 'w1280') : '';
  const posterUrl = tv.poster_path ? getTmdbImageUrl(tv.poster_path, 'w500') : '';

  return (
    <>
      <JsonLd
        data={buildTvSeriesJsonLd({
          id: tv.id,
          name: tv.name,
          overview: tv.overview,
          backdropUrl,
          posterUrl,
          firstAirDate: tv.first_air_date,
          numberOfSeasons: tv.number_of_seasons,
          numberOfEpisodes: tv.number_of_episodes,
          voteAverage: tv.vote_average,
          voteCount: tv.vote_count,
          genres: (tv.genres || []).map((g) => g.name),
          cast: cast.map((c) => c.name),
        })}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'TV Shows', path: '/tv' },
          { name: tv.name, path: `/tv/${tv.id}` },
        ])}
      />
      <DetailViewLayout
        id={tv.id}
        type="tv"
        title={tv.name}
        overview={tv.overview || ''}
        backdropUrl={backdropUrl}
        posterUrl={posterUrl}
        rating={tv.vote_average || 0}
        year={tv.first_air_date ? tv.first_air_date.split('-')[0] : ''}
        ageRating={tv.adult ? 'TV-MA' : undefined}
        tagline={tv.tagline || undefined}
        genres={tv.genres || []}
        cast={cast}
        recommendations={recommendations}
        servers={tv.servers || []}
        numberOfSeasons={tv.number_of_seasons || 1}
        episodes={episodes}
      />
    </>
  );
}
