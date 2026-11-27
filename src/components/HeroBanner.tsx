'use client';

import React, { useRef, useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Info, Plus, Check, Volume2, VolumeX } from 'lucide-react';
import {
  Stack,
  Inline,
  ChamferedButton,
  Badge,
} from '@ripperdoc-chrome77/components';
import { MediaCardModel } from '@/lib/types';
import { useWatchlist } from '@/context/WatchlistContext';
import { strings } from '@/app/strings';

interface HeroBannerProps {
  item: MediaCardModel | null;
  isLive: boolean;
  onOpenInfo: (item: MediaCardModel) => void;
}

const DESKTOP_AUTOPLAY_QUERY = '(min-width: 768px) and (prefers-reduced-motion: no-preference)';
const PREVIEW_MUTED_KEY = 'netwatch_preview_muted';
const MAX_TRAILER_LOOPS = 3;
const YT_PLAYER_STATE_ENDED = 0;

function readStoredPreviewMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(PREVIEW_MUTED_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    // ignore
  }
  return false;
}

function subscribeAutoplayMedia(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(DESKTOP_AUTOPLAY_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getAutoplaySnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(DESKTOP_AUTOPLAY_QUERY).matches;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  item,
  isLive,
  onOpenInfo,
}) => {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loopCountRef = useRef(0);
  const wasPlayingBeforeHideRef = useRef(false);
  const [isMuted, setIsMuted] = useState(() => readStoredPreviewMuted());
  const [loadedTrailerItemId, setLoadedTrailerItemId] = useState<number | null>(null);
  const { isSaved, toggleWatchlist } = useWatchlist();

  const canAutoplayTrailer = useSyncExternalStore(
    subscribeAutoplayMedia,
    getAutoplaySnapshot,
    () => false
  );

  const showIframeTrailer = Boolean(item?.trailerKey && canAutoplayTrailer);

  // Pause banner YouTube trailer when detail preview / search modal is open; resume when closed
  useEffect(() => {
    const handlePause = () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'pauseVideo',
            args: [],
          }),
          '*'
        );
      }
    };

    const handleResume = () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: [],
          }),
          '*'
        );
      }
    };

    window.addEventListener('pause-netwatch-hero', handlePause);
    window.addEventListener('resume-netwatch-hero', handleResume);

    return () => {
      window.removeEventListener('pause-netwatch-hero', handlePause);
      window.removeEventListener('resume-netwatch-hero', handleResume);
    };
  }, []);

  const postPlayerCommand = (func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  };

  useEffect(() => {
    loopCountRef.current = 0;
  }, [item?.id, item?.trailerKey]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      let data: unknown = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;
      const payload = data as { event?: string; info?: number };
      if (payload.event === 'onStateChange' && payload.info === YT_PLAYER_STATE_ENDED) {
        loopCountRef.current += 1;
        if (loopCountRef.current < MAX_TRAILER_LOOPS) {
          postPlayerCommand('seekTo', [0, true]);
          postPlayerCommand('playVideo');
        } else {
          postPlayerCommand('pauseVideo');
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        wasPlayingBeforeHideRef.current = loopCountRef.current < MAX_TRAILER_LOOPS;
        postPlayerCommand('pauseVideo');
        return;
      }
      if (wasPlayingBeforeHideRef.current && loopCountRef.current < MAX_TRAILER_LOOPS) {
        postPlayerCommand('playVideo');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!showIframeTrailer || !item?.trailerKey || isMuted) return;
    const timer = setTimeout(() => {
      postPlayerCommand('unMute');
      postPlayerCommand('setVolume', [70]);
    }, 1600);
    return () => clearTimeout(timer);
  }, [showIframeTrailer, item?.trailerKey, isMuted, loadedTrailerItemId]);

  if (!item) return null;

  const saved = isSaved(item.id, item.type);
  const isVideoLoaded = showIframeTrailer && loadedTrailerItemId === item.id;

  const toggleAudio = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      window.localStorage.setItem(PREVIEW_MUTED_KEY, nextMuted ? '1' : '0');
    } catch {
      // ignore
    }
    postPlayerCommand(nextMuted ? 'mute' : 'unMute');
    if (!nextMuted) postPlayerCommand('setVolume', [70]);
  };

  return (
    <section className="relative w-full min-h-[460px] sm:min-h-[560px] h-[72vh] sm:h-[76vh] md:h-[82vh] overflow-hidden select-none">
      {/* 1. Dynamic Teaser Video / Trailer Layer (Desktop + non-reduced-motion only) */}
      <div className="absolute inset-0 z-0 bg-black">
        {showIframeTrailer && item.trailerKey ? (
          <div className="relative w-full h-full pointer-events-none overflow-hidden">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${item.trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3&fs=0&disablekb=1&showinfo=0&autohide=1&origin=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}`}
              title={item.title}
              allow="autoplay; encrypted-media"
              onLoad={() => {
                setTimeout(() => {
                  setLoadedTrailerItemId(item.id);
                }, 1400);
              }}
              className="absolute top-1/2 left-1/2 w-[165%] h-[165%] -translate-x-1/2 -translate-y-1/2 pointer-events-none filter brightness-[0.88] contrast-[1.05]"
            />
          </div>
        ) : null}

        {/* Backdrop Poster */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
            isVideoLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src={item.backdropUrl || item.imageUrl}
            alt={item.title}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-center filter brightness-[0.82] scale-105"
          />
        </div>

        {/* Crisp Text Readability Scrims */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--rd-color-surface)]/40 via-[var(--rd-color-surface)]/10 to-transparent dark:h-40 dark:from-[var(--rd-color-surface)] dark:via-[var(--rd-color-surface)]/55 z-10 pointer-events-none" />
      </div>

      {/* 2. Foreground Billboard Details */}
      <div className="relative z-20 h-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 flex flex-col justify-end pb-10 sm:pb-16 md:pb-20">
        <Stack gap={3} className="max-w-2xl">
          {/* Uplink Pill & Badges */}
          <Inline gap={2} align="center" wrap>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white border border-white/20 text-xs font-mono font-medium shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              {isLive ? strings.hero.liveUplink : strings.hero.archiveVault}
            </span>

            {item.badge && (
              <Badge variant="primary" pill size="sm">
                {item.badge}
              </Badge>
            )}

            {item.format && (
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-zinc-200 font-mono text-[11px] border border-white/15">
                {item.format}
              </span>
            )}
          </Inline>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white uppercase leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            {item.title}
          </h1>

          {/* Metadata Line */}
          <p className="text-zinc-200 text-xs sm:text-base font-medium drop-shadow-md">
            {item.meta}
          </p>

          {/* Overview Plot */}
          {item.overview && (
            <p className="text-zinc-200 text-xs sm:text-base line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl drop-shadow">
              {item.overview}
            </p>
          )}

          {/* Hero CTAs: Play, Details/Info, and Watchlist Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2">
            <ChamferedButton
              variant="white"
              size="lg"
              leadingIcon={<Play className="w-5 h-5 fill-current" />}
              onClick={() =>
                router.push(
                  item.type === 'anime'
                    ? `/watch/anime/${item.id}/1`
                    : `/watch/${item.type}/${item.id}`
                )
              }
              className="font-bold px-5 sm:px-6 h-11 sm:h-12 text-sm sm:text-base shadow-xl hover:scale-[1.02]"
            >
              {strings.hero.play}
            </ChamferedButton>

            <button
              type="button"
              onClick={() => onOpenInfo(item)}
              className="inline-flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-5 rounded-lg bg-black/65 hover:bg-black/85 backdrop-blur-md text-white border border-white/25 font-semibold text-sm sm:text-base transition-all duration-150 shadow-md hover:scale-[1.02] cursor-pointer"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-200" />
              <span>{strings.hero.info}</span>
            </button>

            <Link
              href={item.type === 'anime' ? `/anime/${item.id}` : `/${item.type}/${item.id}`}
              className="inline-flex items-center gap-2 h-11 sm:h-12 px-4 rounded-lg bg-black/65 hover:bg-black/85 backdrop-blur-md text-white border border-white/25 font-semibold text-sm transition-all duration-150 shadow-md"
            >
              <span>Details</span>
            </Link>

            <button
              type="button"
              onClick={() => void toggleWatchlist(item)}
              className="inline-flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-5 rounded-lg bg-black/65 hover:bg-black/85 backdrop-blur-md text-white border border-white/25 font-semibold text-sm sm:text-base transition-all duration-150 shadow-md hover:scale-[1.02] cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  <span>{strings.hero.inMyList}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span>{strings.hero.addToList}</span>
                </>
              )}
            </button>
          </div>
        </Stack>
      </div>

      {/* 3. Audio Toggle Button (Positioned top-right on mobile, bottom-right on desktop so it never overlaps CTAs) */}
      {showIframeTrailer && (
        <div className="absolute top-6 right-4 sm:top-auto sm:bottom-12 sm:right-6 md:right-8 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAudio}
            aria-label={isMuted ? 'Unmute preview trailer' : 'Mute preview trailer'}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/65 hover:bg-black/85 backdrop-blur-md text-white border border-white/25 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-zinc-300" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      )}
    </section>
  );
};
