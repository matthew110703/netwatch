'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Select } from '@ripperdoc-chrome77/components';
import {
  buildEmbedUrl,
  EMBED_SANDBOX,
  type EmbedProvider,
  type StreamConfig,
} from '@/lib/anime/embed-adapter';
import { useAnimePlayerEvents } from '@/hooks/useAnimePlayerEvents';
import { upsertHistoryCacheEntry } from '@/lib/history-cache';

export interface AnimeEmbeddedPlayerProps {
  anilistId: number;
  title: string;
  poster?: string;
  episode: number;
  malId?: number | null;
  maxEpisodes: number;
  onEpisodeChange: (episode: number) => void;
}

export const AnimeEmbeddedPlayer: React.FC<AnimeEmbeddedPlayerProps> = ({
  anilistId,
  title,
  poster,
  episode,
  malId,
  maxEpisodes,
  onEpisodeChange,
}) => {
  const [provider, setProvider] = useState<EmbedProvider>('aniembed');
  const [track, setTrack] = useState<'sub' | 'dub'>('sub');
  const [startSeconds, setStartSeconds] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [vidriftTmdbId, setVidriffTmdbId] = useState<number | null>(null);
  const [vidriftLoading, setVidriftLoading] = useState(false);
  const lastSaveRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const streamConfig: StreamConfig = useMemo(
    () => ({
      anilistId,
      malId,
      episode,
      track,
      autoplay: true,
      autoNext: true,
      autoSkip: true,
      accentHex: 'b0c6ff',
      customTitle: title,
      startSeconds,
      tmdbId: vidriftTmdbId,
      tmdbType: 'tv',
    }),
    [anilistId, malId, episode, track, startSeconds, title, vidriftTmdbId]
  );

  const embedUrl = useMemo(() => {
    const url = buildEmbedUrl(provider, streamConfig);
    return url ?? '';
  }, [provider, streamConfig]);

  useEffect(() => {
    setLoaded(false);
  }, [embedUrl]);

  const saveProgress = useCallback(
    (currentTime: number, duration: number, force = false) => {
      if (!duration || duration <= 0) return;
      const now = Date.now();
      if (!force && now - lastSaveRef.current < 4500) return;
      lastSaveRef.current = now;
      const progress = Math.min(100, Math.round((currentTime / duration) * 100));
      upsertHistoryCacheEntry({
        id: anilistId,
        type: 'anime',
        title,
        imageUrl: poster ?? '',
        backdropUrl: poster,
        progress,
        resumeEpisode: episode,
        episodeInfo: `Episode ${episode}`,
        meta: 'Anime',
      });
    },
    [anilistId, title, poster, episode]
  );

  const handlePlayerEvent = useCallback(
    (event: { status: string; currentTime?: number; duration?: number }) => {
      if (
        event.status === 'progress' &&
        typeof event.currentTime === 'number' &&
        typeof event.duration === 'number'
      ) {
        saveProgress(event.currentTime, event.duration);
      }
      if (event.status === 'ended' || event.status === 'paused') {
        if (typeof event.currentTime === 'number' && typeof event.duration === 'number') {
          saveProgress(event.currentTime, event.duration, true);
        }
      }
    },
    [saveProgress]
  );

  useAnimePlayerEvents(iframeRef, provider, handlePlayerEvent);

  const activateVidrift = async () => {
    if (vidriftTmdbId) {
      setProvider('vidrift');
      return;
    }
    setVidriftLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(title)}&type=tv&page=1`
      );
      const json = (await res.json()) as { data?: { id: number; title: string }[] };
      const hit = (json.data ?? []).find(
        (item) => item.title.toLowerCase().includes(title.split(' ')[0]?.toLowerCase() ?? '')
      ) ?? json.data?.[0];
      if (hit?.id) {
        setVidriffTmdbId(hit.id);
        setProvider('vidrift');
      }
    } catch (err) {
      console.warn('[AnimePlayer] VidRift lookup failed', err);
    } finally {
      setVidriftLoading(false);
    }
  };

  const switchProvider = (next: EmbedProvider) => {
    if (next === 'vidrift') {
      void activateVidrift();
      return;
    }
    setProvider(next);
  };

  const sourceOptions = [
    { value: 'aniembed' as const, label: 'AniEmbed' },
    { value: 'animeembed' as const, label: 'AnimeEmbed' },
    { value: 'anisrc' as const, label: 'AniSrc' },
    {
      value: 'vidrift' as const,
      label: vidriftLoading ? 'VidRift (finding title…)' : 'VidRift backup',
      disabled: vidriftLoading,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[calc((100dvh-13.5rem)*16/9)] overflow-hidden rounded-xl border border-[var(--rd-color-outline-variant)]/35 bg-[var(--rd-color-surface-container)] md:max-w-[calc((100dvh-9rem)*16/9)]">
      <div className="relative aspect-video w-full bg-black">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--rd-color-primary)]" />
            <p className="text-xs text-zinc-300">Starting playback…</p>
          </div>
        )}
        {embedUrl ? (
          <iframe
            key={embedUrl}
            ref={iframeRef}
            src={embedUrl}
            title={`${title} — episode ${episode}`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            sandbox={EMBED_SANDBOX}
            referrerPolicy="no-referrer"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <h3 className="p-6 text-sm text-zinc-300">Select a provider or resolve VidRift via title search.</h3>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 border-t border-[var(--rd-color-outline-variant)]/30 px-3 py-2.5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="flex items-center gap-1">
          <Select
            id="anime-source"
            size="sm"
            ariaLabel="Source"
            value={provider}
            options={sourceOptions}
            onChange={(value) => switchProvider(value as EmbedProvider)}
          />
          <Select
            id="anime-audio"
            size="sm"
            ariaLabel="Audio"
            value={track}
            options={[
              { value: 'sub', label: 'Sub' },
              { value: 'dub', label: 'Dub' },
            ]}
            onChange={(value) => {
              setStartSeconds(0);
              setTrack(value as 'sub' | 'dub');
            }}
          />
        </div>
        <p className="text-sm font-medium tabular-nums text-[var(--rd-color-on-surface)] sm:text-center">
          Episode {episode}
          <span className="text-[var(--rd-color-on-surface-variant)]"> / {maxEpisodes}</span>
        </p>
        <div className="flex items-center gap-2 sm:justify-end">
          <button
            type="button"
            disabled={episode <= 1}
            onClick={() => onEpisodeChange(episode - 1)}
            className="h-9 px-3 rounded-lg border border-[var(--rd-color-outline-variant)]/50 text-sm font-semibold text-[var(--rd-color-on-surface)] disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={episode >= maxEpisodes}
            onClick={() => onEpisodeChange(episode + 1)}
            className="h-9 px-3 rounded-lg bg-[var(--rd-color-primary)] text-sm font-semibold text-[var(--rd-color-on-primary)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};