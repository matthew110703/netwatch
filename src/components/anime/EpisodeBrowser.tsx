'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Select } from '@ripperdoc-chrome77/components';
import { episodeWindows, windowForEpisode } from '@/lib/anime/presentation';

export interface EpisodeStill {
  episode: number;
  title: string;
  image?: string;
}

interface EpisodeBrowserProps {
  total: number;
  current?: number;
  stills?: EpisodeStill[];
  fallbackImage?: string;
  /** Detail pages navigate. Watch pages call onSelect and keep the player mounted. */
  hrefFor?: (episode: number) => string;
  onSelect?: (episode: number) => void;
}

export function EpisodeBrowser({
  total,
  current,
  stills = [],
  fallbackImage,
  hrefFor,
  onSelect,
}: EpisodeBrowserProps) {
  const windows = useMemo(() => episodeWindows(total), [total]);
  const initial = current ? windowForEpisode(current, total).start : windows[0]?.start ?? 1;
  const [rangeStart, setRangeStart] = useState(initial);

  useEffect(() => {
    if (!current) return;
    setRangeStart(windowForEpisode(current, total).start);
  }, [current, total]);
  const active =
    windows.find((window) => window.start === rangeStart) ??
    windows.find((window) => current && current >= window.start && current <= window.end) ??
    windows[0];

  if (!active) return null;

  const episodes = Array.from({ length: active.end - active.start + 1 }, (_, i) => active.start + i);
  const stillByEpisode = new Map(stills.map((still) => [still.episode, still]));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--rd-color-on-surface)]">Episodes</h2>
        {windows.length > 1 ? (
          <Select
            id="anime-episode-range"
            size="sm"
            align="end"
            ariaLabel="Episode range"
            value={String(active.start)}
            options={windows.map((window) => ({
              value: String(window.start),
              label: window.label,
            }))}
            onChange={(value) => setRangeStart(Number(value))}
          />
        ) : (
          <span className="text-xs font-semibold text-[var(--rd-color-primary)] bg-[var(--rd-color-surface-container-high)] px-3 py-1 rounded-full border border-[var(--rd-color-outline-variant)]/40">
            {total} {total === 1 ? 'episode' : 'episodes'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {episodes.map((episode) => {
          const selected = current === episode;
          const still = stillByEpisode.get(episode);
          const image = still?.image || fallbackImage;
          const className = `overflow-hidden rounded-lg border text-left transition-colors ${
            selected
              ? 'border-[var(--rd-color-primary)] ring-2 ring-[var(--rd-color-primary)]/40'
              : 'border-[var(--rd-color-outline-variant)]/35 bg-[var(--rd-color-surface-container)] hover:border-[var(--rd-color-primary)]/60'
          }`;
          const body = (
            <>
              <div className="relative aspect-video bg-black">
                {image ? (
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  E{episode}
                </span>
              </div>
              <p className="px-2.5 py-2 text-xs font-semibold leading-snug line-clamp-1 text-[var(--rd-color-on-surface)]">
                {still?.title || `Episode ${episode}`}
              </p>
            </>
          );
          if (onSelect) {
            return (
              <button key={episode} type="button" className={className} onClick={() => onSelect(episode)}>
                {body}
              </button>
            );
          }
          return (
            <Link key={episode} href={hrefFor?.(episode) ?? '#'} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
    </section>
  );
}