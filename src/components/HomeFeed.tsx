'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stack,
  Box,
  MediaRail,
  MediaCard,
} from '@ripperdoc-chrome77/components';
import { MediaCardModel, TMDBGenre } from '@/lib/types';
import { getClientDeviceId } from '@/lib/device';
import { useWatchlist } from '@/context/WatchlistContext';
import { HeroBanner } from '@/components/HeroBanner';
import { GenreFilterSection } from '@/components/GenreFilterSection';
import { strings } from '@/app/strings';

interface HomeFeedProps {
  billboardItem: MediaCardModel | null;
  trendingItems: MediaCardModel[];
  topPicksItems: MediaCardModel[];
  popularTvItems: MediaCardModel[];
  topRatedItems: MediaCardModel[];
  genres: TMDBGenre[];
  isLive: boolean;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  billboardItem,
  trendingItems,
  topPicksItems,
  popularTvItems,
  topRatedItems,
  genres,
  isLive,
}) => {
  const router = useRouter();
  const { watchlistItems } = useWatchlist();
  const [continueWatchingItems, setContinueWatchingItems] = useState<MediaCardModel[]>([]);

  useEffect(() => {
    let active = true;
    const deviceId = getClientDeviceId();

    fetch('/api/history?continueWatching=1&limit=12', {
      headers: { 'x-device-id': deviceId },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { cards?: MediaCardModel[] } | null) => {
        if (active && json && Array.isArray(json.cards)) {
          setContinueWatchingItems(json.cards);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleCardClick = (item: MediaCardModel) => {
    window.dispatchEvent(new CustomEvent('open-netwatch-preview', { detail: item }));
  };

  const handleResumeClick = (item: MediaCardModel) => {
    if (item.type === 'tv' && item.resumeSeason && item.resumeEpisode) {
      router.push(`/watch/tv/${item.id}?s=${item.resumeSeason}&e=${item.resumeEpisode}`);
    } else {
      router.push(`/watch/${item.type}/${item.id}`);
    }
  };

  return (
    <Box className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] pb-16 font-body-md">
      {/* 1. Hero Billboard */}
      {billboardItem && (
        <HeroBanner
          item={billboardItem}
          isLive={isLive}
          onOpenInfo={handleCardClick}
        />
      )}

      {/* 2. Main Catalog Sections in 1440px Container */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 mt-6">
        <Stack gap={8}>
          {/* Quick Genre Filter */}
          <GenreFilterSection
            genres={genres}
            mediaType="all"
            onSelectCard={handleCardClick}
          />

          {/* Continue Watching Rail */}
          {continueWatchingItems.length > 0 && (
            <MediaRail
              title="Continue Watching"
              subtitle="Pick up right where you left off"
            >
              {continueWatchingItems.map((item) => (
                <MediaCard
                  key={`cw-${item.type}-${item.id}`}
                  id={item.id}
                  title={item.title}
                  posterUrl={item.imageUrl}
                  backdropUrl={item.backdropUrl}
                  subtitle={item.episodeInfo}
                  progress={item.progress}
                  rating={item.rating}
                  year={item.year}
                  variant="backdrop"
                  href={
                    item.type === 'tv' && item.resumeSeason && item.resumeEpisode
                      ? `/watch/tv/${item.id}?s=${item.resumeSeason}&e=${item.resumeEpisode}`
                      : `/watch/${item.type}/${item.id}`
                  }
                  onClick={() => handleResumeClick(item)}
                />
              ))}
            </MediaRail>
          )}

          {/* My List Rail (Live Watchlist) */}
          {watchlistItems.length > 0 && (
            <MediaRail
              title="My List"
              subtitle="Titles saved to your watchlist"
              viewAllHref="/watchlist"
              onViewAll={() => router.push('/watchlist')}
            >
              {watchlistItems.slice(0, 12).map((item) => (
                <MediaCard
                  key={`wl-${item.type}-${item.id}`}
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

          {/* Rail 1: Top 10 Ranked Trending */}
          {trendingItems.length > 0 && (
            <MediaRail
              title={strings.rails.trendingTitle}
              subtitle={strings.rails.trendingSubtitle}
            >
              {trendingItems.map((item, index) => (
                <MediaCard
                  key={`trending-${item.id}-${index}`}
                  id={item.id}
                  title={item.title}
                  posterUrl={item.imageUrl}
                  backdropUrl={item.backdropUrl}
                  rating={item.rating}
                  year={item.year}
                  variant="ranked"
                  rank={item.rank || index + 1}
                  badge={item.badge}
                  href={`/${item.type}/${item.id}`}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </MediaRail>
          )}

          {/* Rail 2: Top Picks / Now Playing */}
          {topPicksItems.length > 0 && (
            <MediaRail
              title={strings.rails.topPicksTitle}
              subtitle={strings.rails.topPicksSubtitle}
            >
              {topPicksItems.map((item, index) => (
                <MediaCard
                  key={`picks-${item.id}-${index}`}
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

          {/* Rail 3: Binge-Worthy TV Series */}
          {popularTvItems.length > 0 && (
            <MediaRail
              title={strings.rails.popularTvTitle}
              subtitle={strings.rails.popularTvSubtitle}
              viewAllHref="/tv"
              onViewAll={() => router.push('/tv')}
            >
              {popularTvItems.map((item, index) => (
                <MediaCard
                  key={`tv-${item.id}-${index}`}
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

          {/* Rail 4: Critically Acclaimed Masterpieces */}
          {topRatedItems.length > 0 && (
            <MediaRail
              title={strings.rails.topRatedTitle}
              subtitle={strings.rails.topRatedSubtitle}
              viewAllHref="/movies"
              onViewAll={() => router.push('/movies')}
            >
              {topRatedItems.map((item, index) => (
                <MediaCard
                  key={`top-rated-${item.id}-${index}`}
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
        </Stack>
      </div>
    </Box>
  );
};
