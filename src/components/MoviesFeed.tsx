'use client';

import React from 'react';
import {
  Stack,
  Box,
  MediaRail,
  MediaCard,
} from '@ripperdoc-chrome77/components';
import { MoviesFeedData } from '@/services/catalog.service';
import { MediaCardModel } from '@/lib/types';
import { HeroBanner } from '@/components/HeroBanner';
import { GenreFilterSection } from '@/components/GenreFilterSection';
import { strings } from '@/app/movies/strings';

export const MoviesFeed: React.FC<MoviesFeedData> = ({
  spotlightMovie,
  popularMovies,
  topRatedMovies,
  nowPlayingMovies,
  genres,
}) => {
  const handleCardClick = (item: MediaCardModel) => {
    window.dispatchEvent(new CustomEvent('open-netwatch-preview', { detail: item }));
  };

  return (
    <Box className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] pb-16 font-body-md">
      {/* 1. Hero Spotlight */}
      {spotlightMovie && (
        <HeroBanner
          item={spotlightMovie}
          isLive={true}
          onOpenInfo={handleCardClick}
        />
      )}

      {/* 2. Main Content Rails */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 mt-6">
        <Stack gap={8}>
          {/* Live Genre Filter */}
          <GenreFilterSection
            genres={genres}
            mediaType="movie"
            onSelectCard={handleCardClick}
          />

          {/* Rail 1: Popular Movies */}
          {popularMovies.length > 0 && (
            <MediaRail
              title={strings.rails.popularTitle}
              subtitle={strings.rails.popularSubtitle}
            >
              {popularMovies.map((item, index) => (
                <MediaCard
                  key={`popular-movie-${item.id}-${index}`}
                  id={item.id}
                  title={item.title}
                  posterUrl={item.imageUrl}
                  backdropUrl={item.backdropUrl}
                  rating={item.rating}
                  year={item.year}
                  variant="poster"
                  badge={item.badge}
                  href={`/${item.type}/${item.id}`}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </MediaRail>
          )}

          {/* Rail 2: Top Rated Movies */}
          {topRatedMovies.length > 0 && (
            <MediaRail
              title={strings.rails.topRatedTitle}
              subtitle={strings.rails.topRatedSubtitle}
            >
              {topRatedMovies.map((item, index) => (
                <MediaCard
                  key={`top-rated-movie-${item.id}-${index}`}
                  id={item.id}
                  title={item.title}
                  posterUrl={item.imageUrl}
                  backdropUrl={item.backdropUrl}
                  rating={item.rating}
                  year={item.year}
                  variant="poster"
                  badge={item.badge}
                  href={`/${item.type}/${item.id}`}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </MediaRail>
          )}

          {/* Rail 3: Now In Theaters (16:9 Backdrop variant) */}
          {nowPlayingMovies.length > 0 && (
            <MediaRail
              title={strings.rails.nowPlayingTitle}
              subtitle={strings.rails.nowPlayingSubtitle}
            >
              {nowPlayingMovies.map((item, index) => (
                <MediaCard
                  key={`now-playing-movie-${item.id}-${index}`}
                  id={item.id}
                  title={item.title}
                  posterUrl={item.imageUrl}
                  backdropUrl={item.backdropUrl}
                  rating={item.rating}
                  year={item.year}
                  variant="backdrop"
                  badge={item.badge}
                  href={`/${item.type}/${item.id}`}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </MediaRail>
          )}
        </Stack>
      </div>
    </Box>
  );
};
