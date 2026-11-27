'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getClientDeviceId } from '@/lib/device';
import { upsertHistoryCacheEntry } from '@/lib/history-cache';
import { VIDRIFT_ORIGIN } from '@/lib/vidrift-stream';
import { buildServerStreamUrl } from './player.helper';

export interface EmbeddedPlayerProps {
  mediaType: 'movie' | 'tv';
  id: number | string;
  season?: number;
  episode?: number;
  title?: string;
  poster?: string;
  onSelectEpisode?: (seasonNumber: number, episodeNumber: number) => void;
  onExit?: () => void;
  onEnded?: () => void;
}

/** Messages from the VidRift embed. See https://vidrift.net/docs#events */
interface VidriftMessage {
  type?: string;
  season?: number | string | null;
  episode?: number | string | null;
  currentTime?: number;
  duration?: number;
}

export const EmbeddedPlayer: React.FC<EmbeddedPlayerProps> = ({
  mediaType,
  id,
  season = 1,
  episode = 1,
  title,
  poster,
  onSelectEpisode,
  onExit,
  onEnded,
}) => {
  const isTv = mediaType === 'tv';
  const mediaId = typeof id === 'number' ? id : parseInt(String(id), 10);
  const toEpisodeKey = (s: number, e: number) =>
    `${mediaType}:${mediaId}:${isTv ? `${s}:${e}` : 'movie'}`;
  const episodeKey = toEpisodeKey(season, episode);
  const buildSrc = () =>
    buildServerStreamUrl({ serverId: 'vidrift', type: mediaType, id, season, episode });

  // `generation` only changes when this page picks a new title or episode. When the
  // player switches episode itself, it has already navigated, so the iframe is kept.
  const [frame, setFrame] = useState(() => ({
    episodeKey,
    src: buildSrc(),
    generation: 0,
    loaded: false,
  }));
  if (frame.episodeKey !== episodeKey) {
    setFrame({ episodeKey, src: buildSrc(), generation: frame.generation + 1, loaded: false });
  }

  const [resume, setResume] = useState<{ key: string; time: number } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingResumeRef = useRef<number | null>(null);
  const lastHistorySaveRef = useRef(0);
  const playbackPosRef = useRef({ currentTime: 0, duration: 0 });

  const sendToPlayer = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, VIDRIFT_ORIGIN);
  }, []);

  const saveProgress = useCallback(
    (
      event: 'timeupdate' | 'pause' | 'ended',
      currentTime: number,
      duration: number,
      force = false
    ) => {
      if (!mediaId || Number.isNaN(mediaId) || !duration || duration <= 0) return;

      const now = Date.now();
      if (!force && event === 'timeupdate' && now - lastHistorySaveRef.current < 12_000) {
        return;
      }
      lastHistorySaveRef.current = now;

      const progressPct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
      const episodeInfo = isTv ? `S${season} • E${episode}` : undefined;

      upsertHistoryCacheEntry({
        id: mediaId,
        type: mediaType,
        title,
        imageUrl: poster || '',
        backdropUrl: poster,
        progress: Math.round(progressPct),
        resumeSeason: isTv ? season : null,
        resumeEpisode: isTv ? episode : null,
        episodeInfo,
        meta: episodeInfo || (isTv ? 'Series' : 'Film'),
      });

      fetch(`/api/history/${mediaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getClientDeviceId(),
        },
        body: JSON.stringify({
          event,
          currentTime,
          duration,
          progress: progressPct,
          mediaType,
          season: isTv ? season : null,
          episode: isTv ? episode : null,
        }),
        keepalive: force || event !== 'timeupdate',
      }).catch(() => {});
    },
    [mediaId, mediaType, isTv, season, episode, title, poster]
  );

  // Load resume timestamp for current item/episode via BFF
  useEffect(() => {
    pendingResumeRef.current = null;
    playbackPosRef.current = { currentTime: 0, duration: 0 };
    if (!mediaId || Number.isNaN(mediaId)) return;

    const controller = new AbortController();
    const qs = new URLSearchParams({ mediaType });
    if (isTv) {
      qs.set('season', String(season));
      qs.set('episode', String(episode));
    }

    fetch(`/api/history/${mediaId}?${qs.toString()}`, {
      headers: { 'x-device-id': getClientDeviceId() },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        const status = json?.data;
        const p = status?.item_present ? status.data?.progress : null;
        if (!p) return;
        if (isTv && (p.season !== season || p.episode !== episode)) return;
        if (typeof p.currentTime === 'number' && p.currentTime > 5) {
          setResume({ key: episodeKey, time: p.currentTime });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [mediaId, mediaType, isTv, season, episode, episodeKey]);

  useEffect(() => {
    if (!frame.loaded || resume?.key !== episodeKey) return;
    pendingResumeRef.current = resume.time;
    sendToPlayer({ type: 'vidrift:resume', currentTime: resume.time });
  }, [frame.loaded, resume, episodeKey, sendToPlayer]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<VidriftMessage>) => {
      if (event.origin !== VIDRIFT_ORIGIN) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      const data = event.data;
      const currentTime = data?.currentTime;

      switch (data?.type) {
        case 'vidrift:progress':
          if (typeof currentTime !== 'number' || typeof data.duration !== 'number') return;
          playbackPosRef.current = { currentTime, duration: data.duration };
          saveProgress('timeupdate', currentTime, data.duration);
          break;
        case 'vidrift:paused': {
          const { duration } = playbackPosRef.current;
          if (typeof currentTime !== 'number' || currentTime <= 5) return;
          playbackPosRef.current = { currentTime, duration };
          saveProgress('pause', currentTime, duration, true);
          break;
        }
        case 'vidrift:unpaused': {
          // The player can refuse a seek until the viewer's first click, so retry once.
          const target = pendingResumeRef.current;
          pendingResumeRef.current = null;
          if (target !== null && typeof currentTime === 'number' && currentTime < target - 5) {
            sendToPlayer({ type: 'vidrift:resume', currentTime: target });
          }
          break;
        }
        case 'vidrift:ended': {
          const { duration } = playbackPosRef.current;
          saveProgress('ended', duration, duration, true);
          // For TV the player shows its own Up Next card and moves on.
          if (!isTv) onEnded?.();
          break;
        }
        case 'vidrift:episode': {
          const nextSeason = Number(data.season);
          const nextEpisode = Number(data.episode);
          if (!nextSeason || !nextEpisode) return;
          setFrame((prev) => ({
            ...prev,
            episodeKey: toEpisodeKey(nextSeason, nextEpisode),
            loaded: false,
          }));
          onSelectEpisode?.(nextSeason, nextEpisode);
          break;
        }
        case 'vidrift:exit':
          onExit?.();
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  });

  // Persist watch progress when tab goes hidden or player unmounts
  useEffect(() => {
    const persist = () => {
      const { currentTime, duration } = playbackPosRef.current;
      if (currentTime > 5 && duration > 0) {
        saveProgress('pause', currentTime, duration, true);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      persist();
    };
  }, [saveProgress]);

  return (
    <div className="w-full flex flex-col gap-2.5">
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="self-start inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--rd-color-surface-container-high)]/70 hover:bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Details</span>
        </button>
      )}

      <div className="relative w-full aspect-video bg-black overflow-hidden rounded-lg sm:rounded-xl border border-[var(--rd-color-outline-variant)]/30">
        {!frame.loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black pointer-events-none">
            <Loader2 className="w-8 h-8 text-[var(--rd-color-primary)] animate-spin" />
          </div>
        )}
        {/* No `sandbox` attribute: VidRift does not play inside a sandboxed iframe. */}
        <iframe
          ref={iframeRef}
          key={frame.generation}
          src={frame.src}
          title={title || 'Netwatch Player'}
          onLoad={() => setFrame((prev) => ({ ...prev, loaded: true }))}
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
};
