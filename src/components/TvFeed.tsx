'use client';

import React from 'react';
import {
  Stack,
  Box,
  MediaRail,
  MediaCard,
} from '@ripperdoc-chrome77/components';
import { TvFeedData } from '@/services/catalog.service';
import { MediaCardModel } from '@/lib/types';
import { HeroBanner } from '@/components/HeroBanner';
import { WatchHistoryRail } from '@/components/WatchHistoryRail';
import { GenreFilterSection } from '@/components/GenreFilterSection';
import { strings } from '@/app/tv/strings';

export const TvFeed: React.FC<TvFeedData> = ({
  spotlightTv,
  popularTv,
  topRatedTv,
  onTheAirTv,
  genres,
}) => {
  const handleCardClick = (item: MediaCardModel) => {
    window.dispatchEvent(new CustomEvent('open-netwatch-preview', { detail: item }));
  };

  return (
    <Box className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] pb-16 font-body-md">
      {/* 1. Hero Spotlight for TV Series */}
      {spotlightTv && (
        <HeroBanner
          item={spotlightTv}
          isLive={true}
          onOpenInfo={handleCardClick}
        />
      )}

      {/* 2. Main Content Rails */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 mt-6">
        <Stack gap={8}>
          <WatchHistoryRail mediaType="tv" viewAllHref="/watchlist" />
          {/* Live Genre Filter */}
          <GenreFilterSection
            genres={genres}
            mediaType="tv"
            onSelectCard={handleCardClick}
          />

          {/* Rail 1: Popular TV Series */}
          {popularTv.length > 0 && (
            <MediaRail
              title={strings.rails.popularTitle}
              subtitle={strings.rails.popularSubtitle}
            >
              {popularTv.map((item, index) => (
                <MediaCard
                  key={`popular-tv-${item.id}-${index}`}
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

          {/* Rail 2: Top Rated Series */}
          {topRatedTv.length > 0 && (
            <MediaRail
              title={strings.rails.topRatedTitle}
              subtitle={strings.rails.topRatedSubtitle}
            >
              {topRatedTv.map((item, index) => (
                <MediaCard
                  key={`top-rated-tv-${item.id}-${index}`}
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

          {/* Rail 3: Currently Airing / Fresh Episodes (16:9 Backdrop variant) */}
          {onTheAirTv.length > 0 && (
            <MediaRail
              title={strings.rails.onTheAirTitle}
              subtitle={strings.rails.onTheAirSubtitle}
            >
              {onTheAirTv.map((item, index) => (
                <MediaCard
                  key={`on-air-tv-${item.id}-${index}`}
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
