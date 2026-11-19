import React, { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { moviesApi, withFallback } from '@/lib/api';
import { DetailViewLayout } from '@/components/DetailViewLayout';
import { JsonLd } from '@/components/JsonLd';
import { getTmdbImageUrl, mapTmdbMovieToCard } from '@/lib/tmdb-image';
import {
  buildBreadcrumbJsonLd,
  buildMovieJsonLd,
  SITE_NAME,
  truncateDescription,
} from '@/lib/seo';
import { TMDBMovieDetails } from '@/lib/types';

interface MovieDetailPageProps {
  params: Promise<{ id: string }>;
}

const getMovieCached = cache(async (numId: number): Promise<TMDBMovieDetails | null> => {
  try {
    return await moviesApi.getMovieDetails(numId);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: MovieDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    return {
      title: 'Title Not Found',
      description: 'Requested movie could not be found on Netwatch.',
      robots: { index: false, follow: false },
    };
  }

  const movie = await getMovieCached(numId);
  if (!movie) {
    return {
      title: 'Movie Not Found',
      description: 'Requested movie could not be found on Netwatch.',
      robots: { index: false, follow: false },
    };
  }

  const year = movie.release_date ? movie.release_date.split('-')[0] : '';
  const displayTitle = year ? `${movie.title} (${year})` : movie.title;
  const description = truncateDescription(
    movie.overview,
    `Stream ${movie.title} in high definition with multi-language subtitles on Netwatch.`
  );
  const ogImageUrl = movie.backdrop_path
    ? getTmdbImageUrl(movie.backdrop_path, 'w1280')
    : movie.poster_path
      ? getTmdbImageUrl(movie.poster_path, 'w500')
      : undefined;
  const canonicalPath = `/movie/${numId}`;

  return {
    title: displayTitle,
    description,
    keywords: [
      movie.title,
      ...(movie.genres || []).map((g) => g.name),
      ...(movie.credits?.cast || []).slice(0, 4).map((c) => c.name),
      SITE_NAME,
    ],
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${displayTitle} | ${SITE_NAME}`,
      description,
      type: 'video.movie',
      url: canonicalPath,
      siteName: SITE_NAME,
      ...(movie.release_date ? { releaseDate: movie.release_date } : {}),
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
      title: `${displayTitle} | ${SITE_NAME}`,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    notFound();
  }

  const [movie, { data: recRaw }] = await Promise.all([
    getMovieCached(numId),
    withFallback(moviesApi.getRecommendations(numId), {
      page: 1,
      results: [],
      total_pages: 1,
      total_results: 0,
    }),
  ]);

  if (!movie) {
    notFound();
  }

  const recommendations =
    recRaw.results && recRaw.results.length > 0
      ? recRaw.results.map((m) => mapTmdbMovieToCard(m))
      : [];

  const cast = (movie.credits?.cast || []).slice(0, 12).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character || '',
    profileUrl: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w300') : '',
  }));

  const backdropUrl = movie.backdrop_path ? getTmdbImageUrl(movie.backdrop_path, 'w1280') : '';
  const posterUrl = movie.poster_path ? getTmdbImageUrl(movie.poster_path, 'w500') : '';

  return (
    <>
      <JsonLd
        data={buildMovieJsonLd({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          backdropUrl,
          posterUrl,
          releaseDate: movie.release_date,
          runtime: movie.runtime,
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
          genres: (movie.genres || []).map((g) => g.name),
          cast: cast.map((c) => c.name),
        })}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Movies', path: '/movies' },
          { name: movie.title, path: `/movie/${movie.id}` },
        ])}
      />
      <DetailViewLayout
        id={movie.id}
        type="movie"
        title={movie.title}
        overview={movie.overview || ''}
        backdropUrl={backdropUrl}
        posterUrl={posterUrl}
        rating={movie.vote_average || 0}
        year={movie.release_date ? movie.release_date.split('-')[0] : ''}
        runtime={movie.runtime || undefined}
        ageRating={movie.adult ? 'R' : undefined}
        tagline={movie.tagline || undefined}
        genres={movie.genres || []}
        cast={cast}
        recommendations={recommendations}
        servers={movie.servers || []}
      />
    </>
  );
}
