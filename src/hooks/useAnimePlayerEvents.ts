'use client';

import { useEffect } from 'react';
import type { EmbedProvider } from '@/lib/anime/embed-adapter';

export interface UnifiedPlayerEvent {
  provider: EmbedProvider;
  status: 'ready' | 'playing' | 'paused' | 'buffering' | 'progress' | 'ended' | 'error';
  currentTime?: number;
  duration?: number;
  episode?: number;
}

const ALLOWED_ORIGINS = new Set([
  'https://animeembed.com',
  'https://anisrc.ru',
  'https://aniembed.se',
  'https://embed.vidrift.net',
]);

export function useAnimePlayerEvents(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  activeProvider: EmbedProvider,
  onEvent: (event: UnifiedPlayerEvent) => void
) {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      if (!ALLOWED_ORIGINS.has(event.origin)) return;

      let data: unknown = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      const payload = data as Record<string, unknown>;

      if (payload.channel === 'animeembed' && payload.version === 1) {
        const statusMap: Record<string, UnifiedPlayerEvent['status']> = {
          ready: 'ready',
          play: 'playing',
          pause: 'paused',
          buffering: 'buffering',
          progress: 'progress',
          ended: 'ended',
          error: 'error',
        };
        const evt = payload.event;
        const status = typeof evt === 'string' ? statusMap[evt] : undefined;
        if (!status) return;

        const inner = (payload.data ?? {}) as Record<string, unknown>;
        onEvent({
          provider: 'animeembed',
          status,
          currentTime: typeof inner.currentTime === 'number' ? inner.currentTime : undefined,
          duration: typeof inner.duration === 'number' ? inner.duration : undefined,
          episode: typeof payload.episode === 'number' ? payload.episode : undefined,
        });
        return;
      }

      if (payload.type === 'PLAYER_EVENT' && payload.data && typeof payload.data === 'object') {
        const inner = payload.data as Record<string, unknown>;
        const map: Record<string, UnifiedPlayerEvent['status']> = {
          playing: 'playing',
          paused: 'paused',
          completed: 'ended',
          seeked: 'progress',
        };
        const playerStatus = inner.player_status;
        onEvent({
          provider: 'anisrc',
          status: typeof playerStatus === 'string' ? (map[playerStatus] ?? 'progress') : 'progress',
          currentTime:
            typeof inner.player_progress === 'number' ? inner.player_progress : undefined,
          duration:
            typeof inner.player_duration === 'number' ? inner.player_duration : undefined,
          episode:
            typeof (inner.player_info as { episode?: number } | undefined)?.episode === 'number'
              ? (inner.player_info as { episode: number }).episode
              : undefined,
        });
        return;
      }

      if (event.origin === 'https://aniembed.se' && typeof payload.type === 'string') {
        const typeStr = payload.type;
        const status = typeStr.includes('ended')
          ? 'ended'
          : typeStr.includes('play')
            ? 'playing'
            : typeStr.includes('pause')
              ? 'paused'
              : 'progress';
        onEvent({
          provider: 'aniembed',
          status,
          currentTime:
            typeof payload.currentTime === 'number' ? payload.currentTime : undefined,
          duration: typeof payload.duration === 'number' ? payload.duration : undefined,
        });
        return;
      }

      if (event.origin === 'https://embed.vidrift.net' && activeProvider === 'vidrift') {
        const type = typeof payload.type === 'string' ? payload.type : '';
        if (type === 'vidrift:progress' || type === 'progress') {
          onEvent({
            provider: 'vidrift',
            status: 'progress',
            currentTime:
              typeof payload.currentTime === 'number'
                ? payload.currentTime
                : typeof payload.position === 'number'
                  ? payload.position
                  : undefined,
            duration: typeof payload.duration === 'number' ? payload.duration : undefined,
          });
        }
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [iframeRef, onEvent, activeProvider]);
}

export function sendAnimeEmbedCommand(
  iframe: HTMLIFrameElement | null,
  command: 'play' | 'pause' | 'seek' | 'setVolume' | 'setMuted',
  payload?: Record<string, unknown>
) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    {
      channel: 'animeembed',
      version: 1,
      type: 'command',
      command,
      requestId: `cmd_${Date.now()}`,
      ...(payload ?? {}),
    },
    'https://animeembed.com'
  );
}