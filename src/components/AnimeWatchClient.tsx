'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Select } from '@ripperdoc-chrome77/components';
import { AnimeEmbeddedPlayer } from '@/modules/player/AnimeEmbeddedPlayer';
import type { AnimeDetailView } from '@/services/anime-catalog.service';
import { EpisodeBrowser } from '@/components/anime/EpisodeBrowser';

interface AnimeWatchClientProps {
  detail: AnimeDetailView;
  episode: number;
}

export function AnimeWatchClient({ detail, episode: initialEpisode }: AnimeWatchClientProps) {
  const router = useRouter();
  const [episode, setEpisode] = useState(initialEpisode);
  const { card } = detail;
  const currentStill = detail.stills.find((still) => still.episode === episode);
  const episodeName = currentStill?.title
    ?.replace(new RegExp(`^episode\\s*${episode}\\s*[-–:]\\s*`, 'i'), '')
    .trim();

  const goToEpisode = (next: number) => {
    const clamped = Math.min(Math.max(1, next), detail.episodes);
    setEpisode(clamped);
    router.replace(`/watch/anime/${card.id}/${clamped}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full min-h-screen max-w-[1440px] space-y-5 px-4 pb-16 pt-4 md:px-12">
      <AnimeEmbeddedPlayer
        anilistId={card.id}
        title={card.title}
        poster={card.imageUrl}
        episode={episode}
        malId={detail.idMal}
        maxEpisodes={detail.episodes}
        onEpisodeChange={goToEpisode}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--rd-color-on-surface)] leading-tight">
            {card.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--rd-color-on-surface-variant)]">
          <span>Episode {episode}</span>
          {episodeName && <span className="text-[var(--rd-color-on-surface)]">{episodeName}</span>}
          {card.year && <span className="font-mono">{card.year}</span>}
          {card.rating && card.rating > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
              <Star className="w-3.5 h-3.5 fill-current" />
              {card.rating.toFixed(1)}
            </span>
          )}
            <Link href={`/anime/${card.id}`} className="font-semibold text-[var(--rd-color-primary)]">
              Details
            </Link>
          </p>
        </div>
        {detail.seasons.length > 1 && (
          <div className="w-44">
            <Select
              id="anime-season"
              size="sm"
              ariaLabel="Season"
              value={String(card.id)}
              options={detail.seasons.map((season) => ({
                value: String(season.id),
                label: season.year ? `${season.label} · ${season.year}` : season.label,
              }))}
              onChange={(value) => router.push(`/watch/anime/${value}/1`)}
            />
          </div>
        )}
      </div>

      <EpisodeBrowser
        total={detail.episodes}
        current={episode}
        stills={detail.stills}
        fallbackImage={card.imageUrl}
        onSelect={goToEpisode}
      />
    </div>
  );
}
