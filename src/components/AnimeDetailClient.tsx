'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, MediaRail, MediaCard } from '@ripperdoc-chrome77/components';
import { Play, Plus, Check, Star, ArrowLeft, Server } from 'lucide-react';
import type { AnimeDetailView } from '@/services/anime-catalog.service';
import { useWatchlist } from '@/context/WatchlistContext';
import { EpisodeBrowser } from '@/components/anime/EpisodeBrowser';
import { popBackDestination } from '@/lib/navigation-history';

interface AnimeDetailClientProps {
  detail: AnimeDetailView;
}

export function AnimeDetailClient({ detail }: AnimeDetailClientProps) {
  const router = useRouter();
  const { card, synopsis, episodes, recommendations } = detail;
  const { isSaved, toggleWatchlist } = useWatchlist();
  const saved = isSaved(card.id, card.type);
  const genres = card.genres ?? [];

  return (
    <Box className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] overflow-x-hidden pb-24">
      <section className="relative w-full min-h-[480px] md:min-h-[600px] flex flex-col justify-between pt-6 md:pt-8 pb-8 md:pb-12">
        {(card.backdropUrl || card.imageUrl) && (
          <div className="absolute inset-0">
            <img
              alt=""
              src={card.backdropUrl || card.imageUrl}
              fetchPriority="high"
              className="w-full h-full object-cover object-top brightness-[0.65]"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--rd-color-surface)] via-[var(--rd-color-surface)]/70 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--rd-color-surface)]/85 via-[var(--rd-color-surface)]/35 to-transparent pointer-events-none" />

        <div className="relative z-30 max-w-[1440px] mx-auto w-full px-4 md:px-8">
          <button
            type="button"
            onClick={() => router.push(popBackDestination(`/anime/${card.id}`, '/anime'))}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--rd-color-surface-container-lowest)]/85 backdrop-blur-md text-sm font-medium border border-[var(--rd-color-outline-variant)]/50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="relative z-20 max-w-[1440px] mx-auto w-full px-4 md:px-8 mt-10 sm:mt-16 flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
          {card.imageUrl && (
            <div className="hidden md:block w-60 lg:w-64 shrink-0 rounded-xl overflow-hidden shadow-2xl border border-[var(--rd-color-outline-variant)]/40">
              <img alt={card.title} src={card.imageUrl} className="w-full h-[360px] lg:h-[384px] object-cover" />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-3 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-none text-[var(--rd-color-on-surface)]">
              {card.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--rd-color-on-surface-variant)]">
              {card.year && <span className="font-mono">{card.year}</span>}
              <span className="font-mono">
                {episodes} {episodes === 1 ? 'episode' : 'episodes'}
              </span>
              {card.rating && card.rating > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-300">
                  <Star className="w-4 h-4 fill-current" />
                  {card.rating.toFixed(1)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <Server className="w-3 h-3" />
                Multi-source
              </span>
            </div>
            {synopsis && (
              <p className="text-sm sm:text-base leading-relaxed text-[var(--rd-color-on-surface)]/90 line-clamp-4 md:line-clamp-none max-w-3xl">
                {synopsis}
              </p>
            )}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="text-xs px-3 py-1 rounded-full bg-[var(--rd-color-surface-container-high)]/90 border border-[var(--rd-color-outline-variant)]/40 text-[var(--rd-color-on-surface-variant)]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/watch/anime/${card.id}/1`}
                className="inline-flex items-center gap-2 bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] px-6 sm:px-8 py-3.5 rounded-xl font-bold shadow-lg"
              >
                <Play className="w-5 h-5 fill-current" />
                Play episode 1
              </Link>
              <button
                type="button"
                onClick={() => void toggleWatchlist(card)}
                aria-label={saved ? 'Remove from My List' : 'Add to My List'}
                className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                  saved
                    ? 'bg-[var(--rd-color-primary)]/15 text-[var(--rd-color-primary)] border-[var(--rd-color-primary)]/50'
                    : 'bg-[var(--rd-color-surface-container-high)]/85 border-[var(--rd-color-outline-variant)]/50'
                }`}
              >
                {saved ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 mt-8 space-y-10">
        {detail.seasons.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {detail.seasons.map((season) => {
              const active = season.id === card.id;
              return (
                <Link
                  key={season.id}
                  href={`/anime/${season.id}`}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    active
                      ? 'border-[var(--rd-color-primary)] bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)]'
                      : 'border-[var(--rd-color-outline-variant)]/40 bg-[var(--rd-color-surface-container)] text-[var(--rd-color-on-surface)]'
                  }`}
                >
                  {season.label}
                  {season.year ? (
                    <span className={active ? 'opacity-80' : 'text-[var(--rd-color-on-surface-variant)]'}>
                      {season.year}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
        <EpisodeBrowser
          total={episodes}
          stills={detail.stills}
          fallbackImage={card.imageUrl}
          hrefFor={(episode) => `/watch/anime/${card.id}/${episode}`}
        />
        {recommendations.length > 0 && (
          <MediaRail title="More like this" subtitle="Recommended from the same catalog">
            {recommendations.map((item) => (
              <MediaCard
                key={`rec-${item.id}`}
                id={item.id}
                title={item.title}
                posterUrl={item.imageUrl}
                rating={item.rating}
                year={item.year}
                variant="poster"
                href={`/anime/${item.id}`}
                onClick={() => router.push(`/anime/${item.id}`)}
              />
            ))}
          </MediaRail>
        )}
      </div>
    </Box>
  );
}