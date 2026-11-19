'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Plus,
  Check,
  X,
  Clock,
  Calendar,
  Tv,
  Server,
  Volume2,
  VolumeX,
  Info,
} from 'lucide-react';
import { MediaCardModel, TMDBGenre, StreamingServerInfo } from '@/lib/types';
import { useWatchlist } from '@/context/WatchlistContext';

interface PreviewDetail {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  overview: string;
  backdropUrl: string;
  posterUrl: string;
  rating: number;
  year: string;
  runtime?: number;
  tagline?: string;
  genres: TMDBGenre[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  cast?: Array<{
    id: number;
    name: string;
    character: string;
    profileUrl: string;
  }>;
  servers?: StreamingServerInfo[];
  trailerKey?: string;
}

interface QuickPreviewModalProps {
  item: MediaCardModel | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickPreviewModal: React.FC<QuickPreviewModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isSaved, toggleWatchlist } = useWatchlist();
  const [detailState, setDetailState] = useState<{
    key: string;
    data: PreviewDetail;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [loadedVideoKey, setLoadedVideoKey] = useState<string | null>(null);

  const currentItemKey = isOpen && item ? `${item.type}-${item.id}` : null;
  const detail =
    currentItemKey && detailState?.key === currentItemKey ? detailState.data : null;

  useEffect(() => {
    if (!isOpen || !item) return;

    const controller = new AbortController();
    const fetchKey = `${item.type}-${item.id}`;

    fetch(`/api/preview/${item.type}/${item.id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json.data) {
          setDetailState({ key: fetchKey, data: json.data });
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('[PreviewModal] Detail fetch error:', err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isOpen, item]);

  useEffect(() => {
    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    };
  }, [currentItemKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: nextMuted ? 'mute' : 'unMute',
          args: [],
        }),
        '*'
      );
    }
  };

  if (!isOpen || !item || !currentItemKey) return null;

  const currentSaved = isSaved(item.id, item.type);
  const effectiveRating = detail?.rating ?? item.rating ?? 0;
  const matchScore =
    effectiveRating > 0 ? Math.min(99, Math.max(50, Math.round(effectiveRating * 10))) : null;
  const trailerKey = detail?.trailerKey || item.trailerKey;
  const videoInstanceKey = trailerKey ? `${currentItemKey}:${trailerKey}` : null;
  const isVideoLoaded = Boolean(videoInstanceKey && loadedVideoKey === videoInstanceKey);
  const heroImageUrl = detail?.backdropUrl || item.backdropUrl || item.imageUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        onWheel={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--rd-color-surface-container-lowest)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 shadow-2xl z-10 no-scrollbar overscroll-contain"
      >
        {/* Header Backdrop & Ambient Player */}
        <div className="relative flex flex-col justify-end min-h-[260px] sm:min-h-0 sm:aspect-video w-full overflow-hidden bg-black pt-14 sm:pt-16">
          {trailerKey && videoInstanceKey ? (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <iframe
                key={videoInstanceKey}
                ref={iframeRef}
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3&fs=0&disablekb=1&showinfo=0&autohide=1`}
                title={item.title}
                allow="autoplay; encrypted-media"
                onLoad={() => {
                  if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
                  loadTimerRef.current = setTimeout(() => {
                    setLoadedVideoKey(videoInstanceKey);
                  }, 1400);
                }}
                className="absolute top-1/2 left-1/2 w-[160%] h-[160%] -translate-x-1/2 -translate-y-1/2 pointer-events-none filter brightness-[0.9] contrast-[1.05]"
              />
            </div>
          ) : null}

          {/* Backdrop Image Overlay: Covers iframe during initial load */}
          {heroImageUrl ? (
            <div
              className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
                trailerKey && isVideoLoaded ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <img
                alt={item.title}
                className="w-full h-full object-cover filter brightness-[0.75]"
                src={heroImageUrl}
              />
            </div>
          ) : null}

          {/* Crisp Video Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-14 sm:h-16 bg-gradient-to-t from-[var(--rd-color-surface-container-lowest)]/40 via-[var(--rd-color-surface-container-lowest)]/10 to-transparent dark:h-32 dark:sm:h-36 dark:from-[var(--rd-color-surface-container-lowest)] dark:from-20% dark:via-[var(--rd-color-surface-container-lowest)]/75 pointer-events-none z-10" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center bg-black/65 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 transition-all cursor-pointer shadow-lg"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Sound Toggle */}
          {trailerKey && (
            <button
              type="button"
              onClick={toggleMute}
              className="absolute bottom-5 right-3.5 sm:bottom-8 sm:right-8 z-30 w-10 h-10 rounded-full flex items-center justify-center bg-black/65 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
              aria-label={isMuted ? 'Unmute trailer' : 'Mute trailer'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-zinc-200" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              )}
            </button>
          )}

          {/* Foreground Title & Actions (Always crisp text-white against dark header scrim) */}
          <div className="relative z-20 px-5 pb-5 sm:px-8 sm:pb-8 pr-16 sm:pr-24 space-y-2.5 sm:space-y-3 text-white">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/30 backdrop-blur-md text-white font-bold text-xs border border-primary/40 uppercase tracking-wider">
              {item.type === 'tv' ? 'Series Preview' : 'Cinematic Feature'}
            </span>

            <h2
              id="preview-title"
              className="text-xl sm:text-4xl font-extrabold text-white uppercase tracking-tight drop-shadow-md leading-tight"
            >
              {detail?.title || item.title}
            </h2>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/watch/${item.type}/${item.id}`);
                }}
                className="h-10 sm:h-11 inline-flex items-center justify-center gap-2 px-5 sm:px-6 rounded-full bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-all shadow-md hover:scale-[1.02] cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWatchlist(item)}
                className={`h-10 sm:h-11 inline-flex items-center justify-center gap-2 px-4 sm:px-5 rounded-full backdrop-blur-md font-medium text-sm border transition-all cursor-pointer active:scale-95 ${
                  currentSaved
                    ? 'bg-primary/25 text-white border-primary/60'
                    : 'bg-black/60 hover:bg-black/80 text-white border-white/25'
                }`}
              >
                {currentSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>In My List</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add to List</span>
                  </>
                )}
              </button>

              <Link
                href={`/${item.type}/${item.id}`}
                onClick={onClose}
                className="h-10 sm:h-11 inline-flex items-center justify-center gap-2 px-4 sm:px-5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/25 backdrop-blur-md font-medium text-sm transition-all active:scale-95"
              >
                <Info className="w-4 h-4" />
                <span>Full Details</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Details & Metadata Body */}
        <div className="p-5 sm:p-6 md:p-8 space-y-6">
          {/* Metadata Badges Bar */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {matchScore !== null && (
              <span className="inline-flex items-center h-6 px-2.5 rounded-md font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-mono text-xs tracking-wide">
                {matchScore}% MATCH
              </span>
            )}

            {(detail?.year || item.year) && (
              <div className="inline-flex items-center h-6 gap-1.5 text-[var(--rd-color-on-surface-variant)] font-mono text-xs">
                <Calendar className="w-3.5 h-3.5" />
                <span>{detail?.year || item.year}</span>
              </div>
            )}

            {detail?.runtime && detail.runtime > 0 ? (
              <div className="inline-flex items-center h-6 gap-1.5 text-[var(--rd-color-on-surface-variant)] font-mono text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {Math.floor(detail.runtime / 60)}h {detail.runtime % 60}m
                </span>
              </div>
            ) : null}

            {detail?.numberOfSeasons && detail.numberOfSeasons > 0 ? (
              <div className="inline-flex items-center h-6 gap-1.5 text-[var(--rd-color-on-surface-variant)] font-mono text-xs">
                <Tv className="w-3.5 h-3.5" />
                <span>{detail.numberOfSeasons} Seasons</span>
              </div>
            ) : null}

            <span className="inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-mono uppercase bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface-variant)] border border-[var(--rd-color-outline-variant)]/60">
              4K ULTRA HD
            </span>

            {/* Live Streaming Server Badge */}
            <div className="inline-flex items-center h-6 gap-1.5 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-medium sm:ml-auto">
              <Server className="w-3.5 h-3.5" />
              <span>Multi-Source Ready</span>
            </div>
          </div>

          {/* Tagline */}
          {detail?.tagline && (
            <p className="italic text-[var(--rd-color-on-surface-variant)] font-medium text-sm">
              &ldquo;{detail.tagline}&rdquo;
            </p>
          )}

          {/* Plot Overview */}
          <p className="text-sm sm:text-base text-[var(--rd-color-on-surface)]/90 leading-relaxed font-normal">
            {detail?.overview || item.overview || 'No synopsis available for this title yet.'}
          </p>

          {/* Genres Pills */}
          {(detail?.genres || []).length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[var(--rd-color-outline)]">
                Genres
              </span>
              <div className="flex flex-wrap gap-2">
                {detail?.genres.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center h-7 px-3 rounded-full bg-[var(--rd-color-surface-container-high)]/80 border border-[var(--rd-color-outline-variant)]/60 text-[var(--rd-color-on-surface)] text-xs font-medium"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cast Members */}
          {(detail?.cast || []).length > 0 && (
            <div className="space-y-3 pt-3 border-t border-[var(--rd-color-outline-variant)]/30">
              <span className="text-xs font-mono text-[var(--rd-color-on-surface-variant)] uppercase tracking-wider">
                Starring Cast
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {detail?.cast?.map((member) => (
                  <div key={member.id} className="text-center space-y-1">
                    {member.profileUrl ? (
                      <img
                        alt={member.name}
                        className="w-16 h-16 rounded-full mx-auto object-cover border border-[var(--rd-color-outline-variant)]/40 shadow-sm bg-[var(--rd-color-surface-container-high)]"
                        src={member.profileUrl}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border border-[var(--rd-color-outline-variant)]/40 bg-[var(--rd-color-surface-container-high)] text-xs font-bold text-[var(--rd-color-on-surface-variant)]">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <p className="text-xs font-bold text-[var(--rd-color-on-surface)] truncate">
                      {member.name}
                    </p>
                    <p className="text-[11px] text-[var(--rd-color-on-surface-variant)] truncate">
                      {member.character}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
