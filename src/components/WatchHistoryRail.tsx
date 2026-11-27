'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MediaCard, MediaRail } from '@ripperdoc-chrome77/components';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { MediaCardModel } from '@/lib/types';

interface WatchHistoryRailProps {
  mediaType?: 'movie' | 'tv' | 'anime';
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
}

export const WatchHistoryRail: React.FC<WatchHistoryRailProps> = ({
  mediaType,
  title = 'Watch History',
  subtitle = 'Pick up where you left off or revisit recent titles',
  viewAllHref = '/watchlist',
}) => {
  const router = useRouter();
  const { items, isLoading } = useWatchHistory({ limit: 12, mediaType });

  if (!isLoading && items.length === 0) {
    return null;
  }

  const handleResumeClick = (item: MediaCardModel) => {
    if (item.type === 'anime') {
      const ep = item.resumeEpisode ?? 1;
      router.push(`/watch/anime/${item.id}/${ep}`);
      return;
    }
    if (item.type === 'tv' && item.resumeSeason && item.resumeEpisode) {
      router.push(`/watch/tv/${item.id}?s=${item.resumeSeason}&e=${item.resumeEpisode}`);
    } else {
      router.push(`/watch/${item.type}/${item.id}`);
    }
  };

  const handleCardClick = (item: MediaCardModel) => {
    window.dispatchEvent(new CustomEvent('open-netwatch-preview', { detail: item }));
  };

  if (isLoading && items.length === 0) {
    return (
      <MediaRail title={title} subtitle={subtitle}>
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="shrink-0 w-[220px] aspect-video rounded-xl bg-[var(--rd-color-surface-container-high)] animate-pulse"
          />
        ))}
      </MediaRail>
    );
  }

  return (
    <MediaRail
      title={title}
      subtitle={subtitle}
      viewAllHref={viewAllHref}
      onViewAll={() => router.push(viewAllHref)}
    >
      {items.map((item) => (
        <MediaCard
          key={`wh-${item.type}-${item.id}`}
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
          onClick={() => {
            if (item.progress && item.progress > 0 && item.progress < 95) {
              handleResumeClick(item);
            } else {
              handleCardClick(item);
            }
          }}
        />
      ))}
    </MediaRail>
  );
}