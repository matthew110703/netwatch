'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Stack, MediaRail, MediaCard, ChamferedButton } from '@ripperdoc-chrome77/components';
import { Play, Info, Plus, Check, Star } from 'lucide-react';
import type { AnimeFeedData } from '@/services/anime-catalog.service';
import { MediaCardModel } from '@/lib/types';
import { WatchHistoryRail } from '@/components/WatchHistoryRail';
import { useWatchlist } from '@/context/WatchlistContext';

export const AnimeFeed: React.FC<AnimeFeedData> = ({
  spotlightAnime,
  trending,
  popular,
  topScored,
  thisSeason,
  airing,
}) => {
  const router = useRouter();

  const openDetail = (item: MediaCardModel) => {
    router.push(`/anime/${item.id}`);
  };

  return (
    <Box className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] pb-16 font-body-md">
      {spotlightAnime && <AnimeHero item={spotlightAnime} />}

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 mt-6">
        <Stack gap={8}>
          <WatchHistoryRail
            mediaType="anime"
            title="Continue Watching"
            subtitle="Pick up the episode you left"
            viewAllHref="/watchlist"
          />
          <AnimeRail title="Trending Now" subtitle="What people are starting this week" items={trending} onOpen={openDetail} />
          <AnimeRail title="Popular" subtitle="The titles that stay on lists" items={popular} onOpen={openDetail} />
          <AnimeRail
            title="Top Scored"
            subtitle="Highest rated on AniList"
            items={topScored}
            onOpen={openDetail}
            ranked
          />
          <AnimeRail
            title="This Season"
            subtitle="Airing in the current season"
            items={thisSeason}
            onOpen={openDetail}
            backdrop
          />
          <AnimeRail title="Airing Now" subtitle="New episodes this week" items={airing} onOpen={openDetail} />
        </Stack>
      </div>
    </Box>
  );
};

function AnimeHero({ item }: { item: MediaCardModel }) {
  const router = useRouter();
  const { isSaved, toggleWatchlist } = useWatchlist();
  const saved = isSaved(item.id, item.type);

  return (
    <section className="relative w-full min-h-[460px] sm:min-h-[560px] h-[72vh] sm:h-[76vh] overflow-hidden select-none">
      <div className="absolute inset-0 z-0 bg-black">
        <img
          src={item.backdropUrl || item.imageUrl}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-center brightness-[0.82] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[var(--rd-color-surface)] via-[var(--rd-color-surface)]/55 to-transparent" />
      </div>
      <div className="relative z-10 h-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 flex flex-col justify-end pb-10 sm:pb-16">
        <div className="max-w-2xl flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white border border-white/20 text-xs font-medium">
              Anime
            </span>
            {item.badge && (
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] text-[11px] font-bold uppercase tracking-wide">
                {item.badge}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05] line-clamp-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            {item.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-200">
            {item.year && <span className="font-mono">{item.year}</span>}
            {item.meta && <span>{item.meta}</span>}
            {item.rating && item.rating > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                <Star className="w-4 h-4 fill-current" />
                {item.rating.toFixed(1)}
              </span>
            )}
          </div>
          {item.overview && (
            <p className="text-zinc-200 text-sm sm:text-base line-clamp-3 leading-relaxed max-w-xl">
              {item.overview}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <ChamferedButton
              variant="white"
              size="lg"
              leadingIcon={<Play className="w-5 h-5 fill-current" />}
              onClick={() => router.push(`/watch/anime/${item.id}/1`)}
              className="font-bold px-5 sm:px-6 h-11 sm:h-12"
            >
              Play
            </ChamferedButton>
            <button
              type="button"
              onClick={() => router.push(`/anime/${item.id}`)}
              className="inline-flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-5 rounded-lg bg-black/65 hover:bg-black/85 text-white border border-white/25 font-semibold text-sm"
            >
              <Info className="w-4 h-4" />
              Details
            </button>
            <button
              type="button"
              onClick={() => void toggleWatchlist(item)}
              className="inline-flex items-center gap-2 h-11 sm:h-12 px-4 rounded-lg bg-black/65 hover:bg-black/85 text-white border border-white/25 font-semibold text-sm"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
              {saved ? 'In My List' : 'My List'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnimeRail({
  title,
  subtitle,
  items,
  onOpen,
  ranked = false,
  backdrop = false,
}: {
  title: string;
  subtitle: string;
  items: MediaCardModel[];
  onOpen: (item: MediaCardModel) => void;
  ranked?: boolean;
  backdrop?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <MediaRail title={title} subtitle={subtitle}>
      {items.map((item, index) => (
        <MediaCard
          key={`${title}-${item.id}`}
          id={item.id}
          title={item.title}
          posterUrl={item.imageUrl}
          backdropUrl={item.backdropUrl}
          rating={item.rating}
          year={item.year}
          badge={item.badge}
          variant={backdrop ? 'backdrop' : ranked ? 'ranked' : 'poster'}
          rank={ranked ? index + 1 : undefined}
          href={`/anime/${item.id}`}
          onClick={() => onOpen(item)}
        />
      ))}
    </MediaRail>
  );
}