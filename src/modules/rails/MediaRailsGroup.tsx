'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MediaRail, MediaCard } from '@ripperdoc-chrome77/components';
import { RAILS_STRINGS } from './strings';
import {
  MOCK_TRENDING_ITEMS,
  MOCK_POPULAR_MOVIES,
  MOCK_TOP_RATED_SERIES,
} from './mock';
import { formatMediaCardProps } from './rails.helper';
import { MediaItem } from '@/lib/types';

export interface MediaRailsGroupProps {
  trendingItems?: MediaItem[];
  popularMovies?: MediaItem[];
  topRatedSeries?: MediaItem[];
}

export const MediaRailsGroup: React.FC<MediaRailsGroupProps> = ({
  trendingItems = MOCK_TRENDING_ITEMS,
  popularMovies = MOCK_POPULAR_MOVIES,
  topRatedSeries = MOCK_TOP_RATED_SERIES,
}) => {
  const router = useRouter();

  const handleSelectMedia = (item: MediaItem) => {
    const type = item.media_type || (item.name ? 'tv' : 'movie');
    router.push(`/watch/${type}/${item.id}`);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto py-10 space-y-12">
      {/* Rail 1: Trending Now */}
      <MediaRail
        title={RAILS_STRINGS.TRENDING_NOW}
        subtitle={RAILS_STRINGS.TRENDING_SUBTITLE}
        viewAllHref="#trending"
      >
        {trendingItems.map((item, index) => {
          const cardProps = formatMediaCardProps(item);
          return (
            <MediaCard
              key={`${item.id}-${index}`}
              {...cardProps}
              isActive={index === 0}
              onClick={() => handleSelectMedia(item)}
            />
          );
        })}
      </MediaRail>

      {/* Rail 2: Popular Movies */}
      <MediaRail
        title={RAILS_STRINGS.POPULAR_MOVIES}
        subtitle={RAILS_STRINGS.POPULAR_SUBTITLE}
        viewAllHref="#movies"
      >
        {popularMovies.map((item, index) => {
          const cardProps = formatMediaCardProps(item);
          return (
            <MediaCard
              key={`${item.id}-${index}`}
              {...cardProps}
              onClick={() => handleSelectMedia(item)}
            />
          );
        })}
      </MediaRail>

      {/* Rail 3: Top Rated Series */}
      <MediaRail
        title={RAILS_STRINGS.TOP_RATED_TV}
        subtitle={RAILS_STRINGS.TOP_RATED_SUBTITLE}
        viewAllHref="#tv"
      >
        {topRatedSeries.map((item, index) => {
          const cardProps = formatMediaCardProps(item);
          return (
            <MediaCard
              key={`${item.id}-${index}`}
              {...cardProps}
              onClick={() => handleSelectMedia(item)}
            />
          );
        })}
      </MediaRail>
    </div>
  );
};
