'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Plus,
  Check,
  ThumbsUp,
  Share2,
  Star,
  Server,
  ArrowLeft,
} from 'lucide-react';
import { MediaCardModel, TMDBGenre, StreamingServerInfo } from '@/lib/types';
import { Select } from '@ripperdoc-chrome77/components';
import { CastSection } from '@/modules/media-detail/CastSection';
import { popBackDestination } from '@/lib/navigation-history';
import { useWatchlist } from '@/context/WatchlistContext';

export interface CastMemberDetail {
  id: number;
  name: string;
  character: string;
  profileUrl: string;
}

export interface EpisodeItem {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  stillUrl?: string;
  runtime?: number;
}

export interface DetailViewLayoutProps {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  overview: string;
  backdropUrl: string;
  posterUrl: string;
  rating: number;
  year: string;
  runtime?: number;
  ageRating?: string;
  tagline?: string;
  genres: TMDBGenre[];
  cast: CastMemberDetail[];
  recommendations: MediaCardModel[];
  servers?: StreamingServerInfo[];
  numberOfSeasons?: number;
  episodes?: EpisodeItem[];
}

const LIKES_EVENT = 'netwatch-likes-change';
const LIKES_STORAGE_KEY = 'netwatch_likes';

function subscribeLikes(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(LIKES_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(LIKES_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function readLikeSnapshot(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(LIKES_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(parsed[key]);
  } catch {
    return false;
  }
}

export const DetailViewLayout: React.FC<DetailViewLayoutProps> = ({
  id,
  type,
  title,
  overview,
  backdropUrl,
  posterUrl,
  rating,
  year,
  runtime,
  ageRating,
  tagline,
  genres,
  cast,
  recommendations,
  servers = [],
  numberOfSeasons = 1,
  episodes = [],
}) => {
  const router = useRouter();
  const { isSaved, toggleWatchlist } = useWatchlist();
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonCache, setSeasonCache] = useState<Record<string, EpisodeItem[]>>({});
  const [loadingSeasonKey, setLoadingSeasonKey] = useState<string | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const seasonAbortRef = useRef<AbortController | null>(null);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const likeKey = `${type}:${id}`;
  const liked = useSyncExternalStore(
    subscribeLikes,
    () => readLikeSnapshot(likeKey),
    () => false
  );

  useEffect(() => {
    return () => {
      seasonAbortRef.current?.abort();
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    };
  }, []);

  const toggleLike = () => {
    try {
      const raw = window.localStorage.getItem(LIKES_STORAGE_KEY);
      const parsed: Record<string, boolean> = raw ? JSON.parse(raw) : {};
      if (liked) {
        delete parsed[likeKey];
      } else {
        parsed[likeKey] = true;
      }
      window.localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new Event(LIKES_EVENT));
    } catch {
      // Ignore storage quota or private-mode restrictions
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: tagline || overview || `Watch ${title} on Netwatch`,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      shareTimerRef.current = setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      // Clipboard blocked in restricted browser contexts
    }
  };

  const handleSeasonChange = async (nextSeason: number) => {
    setSelectedSeason(nextSeason);
    setSeasonError(null);

    const cacheKey = `${id}:${nextSeason}`;
    if (seasonCache[cacheKey] || (nextSeason === 1 && episodes.length > 0)) {
      return;
    }

    seasonAbortRef.current?.abort();
    const controller = new AbortController();
    seasonAbortRef.current = controller;
    setLoadingSeasonKey(cacheKey);

    try {
      const res = await fetch(`/api/tv/${id}/season/${nextSeason}`, {
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Failed to load Season ${nextSeason}`);
      }
      const fetchedEpisodes: EpisodeItem[] = Array.isArray(json.data?.episodes)
        ? json.data.episodes
        : [];
      setSeasonCache((prev) => ({
        ...prev,
        [cacheKey]: fetchedEpisodes,
      }));
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setSeasonError(
        err instanceof Error ? err.message : `Unable to load Season ${nextSeason}`
      );
    } finally {
      setLoadingSeasonKey((prev) => (prev === cacheKey ? null : prev));
    }
  };

  const mediaItemForWatchlist: MediaCardModel = {
    id,
    type,
    title,
    meta: `${type === 'tv' ? 'Series' : 'Feature Film'}${year ? ` • ${year}` : ''}`,
    imageUrl: posterUrl,
    backdropUrl,
    rating,
    overview,
    year,
  };

  const saved = isSaved(id, type);
  const matchScore = rating > 0 ? Math.min(99, Math.max(50, Math.round(rating * 10))) : null;
  const hours = runtime ? Math.floor(runtime / 60) : 0;
  const minutes = runtime ? runtime % 60 : 0;
  const durationText =
    runtime && runtime > 0 ? (hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`) : null;

  const primaryServer = servers.find((s) => s.isRecommended) || servers[0] || null;
  const activeCacheKey = `${id}:${selectedSeason}`;
  const isLoadingSeason = loadingSeasonKey === activeCacheKey;
  const activeEpisodes =
    seasonCache[activeCacheKey] ?? (selectedSeason === 1 ? episodes : []);

  const getWatchHref = (seasonNumber?: number, episodeNumber?: number) =>
    type === 'tv'
      ? `/watch/tv/${id}?s=${seasonNumber || selectedSeason}&e=${episodeNumber || 1}`
      : `/watch/movie/${id}`;

  return (
    <div className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] overflow-x-hidden pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[480px] md:min-h-[600px] flex flex-col justify-between pt-6 md:pt-8 pb-8 md:pb-12">
        {/* Backdrop Image */}
        {backdropUrl && (
          <div className="absolute inset-0 w-full h-full">
            <img
              alt={title}
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-top filter brightness-[0.65] contrast-[1.05]"
              src={backdropUrl}
            />
          </div>
        )}

        {/* Hero Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--rd-color-surface)]/90 via-[var(--rd-color-surface)]/50 to-transparent dark:from-[var(--rd-color-surface)] dark:via-[var(--rd-color-surface)]/70 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--rd-color-surface)]/70 via-[var(--rd-color-surface)]/25 to-transparent dark:from-[var(--rd-color-surface)]/85 dark:via-[var(--rd-color-surface)]/35 z-10 pointer-events-none" />

        {/* Back Button (normal flow — never collides with title on mobile) */}
        <div className="relative z-30 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() =>
              router.push(
                popBackDestination(`/${type}/${id}`, type === 'tv' ? '/tv' : '/movies')
              )
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--rd-color-surface-container-lowest)]/85 backdrop-blur-md text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-lowest)] transition-all text-sm font-medium border border-[var(--rd-color-outline-variant)]/50 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Content Container aligned to bottom */}
        <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 mt-10 sm:mt-16 flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
          {/* Poster Box (Desktop) */}
          {posterUrl && (
            <div className="hidden md:block w-60 lg:w-64 shrink-0 rounded-xl overflow-hidden shadow-2xl border border-[var(--rd-color-outline-variant)]/40 bg-[var(--rd-color-surface-container-lowest)]">
              <img
                alt={title}
                decoding="async"
                className="w-full h-[360px] lg:h-[384px] object-cover"
                src={posterUrl}
              />
            </div>
          )}

          {/* Details & Actions */}
          <div className="flex-1 flex flex-col gap-3 md:gap-4 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[var(--rd-color-on-surface)] uppercase tracking-tight leading-none drop-shadow-sm">
              {title}
            </h1>

            {tagline && (
              <p className="text-[var(--rd-color-primary)] font-medium italic text-sm md:text-base">
                &ldquo;{tagline}&rdquo;
              </p>
            )}

            {/* Metadata Row */}
            <div className="flex items-center gap-3 text-sm text-[var(--rd-color-on-surface-variant)] flex-wrap">
              {matchScore !== null && (
                <span className="text-[var(--rd-color-primary)] font-bold font-mono">
                  {matchScore}% Match
                </span>
              )}
              {year && <span className="font-mono">{year}</span>}
              {ageRating && (
                <span className="px-2 py-0.5 border border-[var(--rd-color-outline-variant)] rounded-sm text-xs font-mono">
                  {ageRating}
                </span>
              )}
              {type === 'tv' ? (
                <span className="font-mono">
                  {numberOfSeasons} {numberOfSeasons === 1 ? 'Season' : 'Seasons'}
                </span>
              ) : (
                durationText && <span className="font-mono">{durationText}</span>
              )}
              <span className="flex items-center gap-1 font-mono text-amber-600 dark:text-amber-300 font-semibold">
                <Star className="w-4 h-4 fill-current" />{' '}
                {rating > 0 ? rating.toFixed(1) : 'NR'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                <Server className="w-3 h-3" />
                <span>
                  {primaryServer
                    ? `${primaryServer.name} ${primaryServer.quality || 'HD'} Ready`
                    : 'Multi-Source Ready'}
                </span>
              </span>
            </div>

            {/* Synopsis */}
            {overview && (
              <p className="text-sm sm:text-base text-[var(--rd-color-on-surface)]/90 line-clamp-4 md:line-clamp-none leading-relaxed">
                {overview}
              </p>
            )}

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="text-xs px-3 py-1 bg-[var(--rd-color-surface-container-high)]/90 rounded-full text-[var(--rd-color-on-surface-variant)] backdrop-blur-sm border border-[var(--rd-color-outline-variant)]/40"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Actions Row */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href={getWatchHref(selectedSeason, 1)}
                className="bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-95 hover:scale-[1.02] active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{type === 'tv' ? `Play S${selectedSeason} E1` : 'Play Feature'}</span>
              </Link>

              <button
                type="button"
                onClick={() => toggleWatchlist(mediaItemForWatchlist)}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${
                  saved
                    ? 'bg-[var(--rd-color-primary)]/15 text-[var(--rd-color-primary)] border-[var(--rd-color-primary)]/50'
                    : 'bg-[var(--rd-color-surface-container-high)]/85 text-[var(--rd-color-on-surface)] border-[var(--rd-color-outline-variant)]/50 hover:bg-[var(--rd-color-surface-container-highest)]'
                }`}
                aria-label={saved ? 'Remove from My List' : 'Add to My List'}
                title={saved ? 'Remove from My List' : 'Add to My List'}
              >
                {saved ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleLike}
                aria-pressed={liked}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${
                  liked
                    ? 'bg-[var(--rd-color-primary)]/15 text-[var(--rd-color-primary)] border-[var(--rd-color-primary)]/50'
                    : 'bg-[var(--rd-color-surface-container-high)]/85 text-[var(--rd-color-on-surface)] border-[var(--rd-color-outline-variant)]/50 hover:bg-[var(--rd-color-surface-container-highest)]'
                }`}
                aria-label={liked ? 'Unlike this title' : 'Like this title'}
                title={liked ? 'Liked' : 'Like'}
              >
                <ThumbsUp className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 h-11 sm:h-12 px-4 rounded-full backdrop-blur-md border bg-[var(--rd-color-surface-container-high)]/85 text-[var(--rd-color-on-surface)] border-[var(--rd-color-outline-variant)]/50 hover:bg-[var(--rd-color-surface-container-highest)] transition-all cursor-pointer text-sm font-medium"
                aria-label="Share this title"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BODY CONTENT: EPISODES, CAST, RECOMMENDATIONS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-10 space-y-12">
        {/* TV EPISODES PICKER (If TV Series) */}
        {type === 'tv' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--rd-color-outline-variant)]/30">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--rd-color-on-surface)]">
                Episodes
              </h2>
              {numberOfSeasons > 1 && (
                <div className="flex items-center gap-2">
                  <label
                    id="detail-season-label"
                    htmlFor="detail-season-select"
                    className="text-sm text-[var(--rd-color-on-surface-variant)] font-mono"
                  >
                    Season:
                  </label>
                  <Select
                    id="detail-season-select"
                    size="sm"
                    align="end"
                    ariaLabelledBy="detail-season-label"
                    value={String(selectedSeason)}
                    options={Array.from({ length: numberOfSeasons }, (_, i) => ({
                      value: String(i + 1),
                      label: `Season ${i + 1}`,
                    }))}
                    onChange={(val) => void handleSeasonChange(Number(val))}
                  />
                </div>
              )}
            </div>

            {seasonError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between gap-4">
                <p className="text-sm text-red-600 dark:text-red-300">{seasonError}</p>
                <button
                  type="button"
                  onClick={() => handleSeasonChange(selectedSeason)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--rd-color-surface-container-highest)] text-[var(--rd-color-on-surface)] text-xs font-semibold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {isLoadingSeason ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl overflow-hidden bg-[var(--rd-color-surface-container-high)] border border-[var(--rd-color-outline-variant)]/25 animate-pulse"
                  >
                    <div className="aspect-video w-full bg-[var(--rd-color-surface-container-highest)]" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-16 rounded bg-[var(--rd-color-surface-container-highest)]" />
                      <div className="h-4 w-3/4 rounded bg-[var(--rd-color-surface-container-highest)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeEpisodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeEpisodes.map((ep) => {
                  const thumbSrc = ep.stillUrl || backdropUrl;
                  return (
                    <Link
                      key={ep.id || `${ep.season_number}-${ep.episode_number}`}
                      href={getWatchHref(ep.season_number || selectedSeason, ep.episode_number)}
                      className="group relative flex flex-col text-left rounded-xl overflow-hidden bg-[var(--rd-color-surface-container-high)] border border-[var(--rd-color-outline-variant)]/30 hover:border-[var(--rd-color-primary)]/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="relative aspect-video w-full bg-[var(--rd-color-surface-container-highest)] overflow-hidden">
                        {thumbSrc ? (
                          <img
                            alt={ep.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            src={thumbSrc}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                        {ep.runtime && ep.runtime > 0 ? (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/80 text-white">
                            {ep.runtime}m
                          </span>
                        ) : null}
                      </div>
                      <div className="p-3.5 space-y-1 w-full">
                        <div className="flex items-center justify-between text-xs text-[var(--rd-color-primary)] font-mono font-medium">
                          <span>
                            S{ep.season_number || selectedSeason} : E{ep.episode_number}
                          </span>
                        </div>
                        <h3 className="font-bold text-[var(--rd-color-on-surface)] truncate text-sm group-hover:text-[var(--rd-color-primary)] transition-colors">
                          {ep.name || `Episode ${ep.episode_number}`}
                        </h3>
                        {ep.overview && (
                          <p className="text-xs text-[var(--rd-color-on-surface-variant)] line-clamp-2">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : !seasonError ? (
              <p className="text-sm text-[var(--rd-color-on-surface-variant)]">
                No episode metadata available for Season {selectedSeason} yet. You can still launch the stream directly with the Play button above.
              </p>
            ) : null}
          </section>
        )}

        {/* CAST & CREW SECTION */}
        {cast.length > 0 && <CastSection cast={cast} variant="detail" />}

        {/* MORE LIKE THIS RECOMMENDATIONS */}
        {recommendations.length > 0 && (
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--rd-color-on-surface)] mb-4">
              More Like This
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {recommendations.slice(0, 10).map((rec) => (
                <Link
                  key={`${rec.type}-${rec.id}`}
                  href={`/${rec.type}/${rec.id}`}
                  className="group relative text-left rounded-xl overflow-hidden aspect-[2/3] bg-[var(--rd-color-surface-container-high)] border border-[var(--rd-color-outline-variant)]/30 hover:border-[var(--rd-color-primary)]/50 transition-all duration-300 cursor-pointer shadow-md hover:scale-[1.03]"
                >
                  {rec.imageUrl ? (
                    <img
                      alt={rec.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      src={rec.imageUrl}
                    />
                  ) : null}

                  {/* Always readable on touchscreens; reveal extra polish on desktop hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-white text-sm font-bold truncate">{rec.title}</p>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      {rec.badge ? (
                        <span className="text-emerald-300 text-xs font-mono">
                          {rec.badge}
                        </span>
                      ) : rec.year ? (
                        <span className="text-white/80 text-xs font-mono">{rec.year}</span>
                      ) : (
                        <span />
                      )}
                      <div className="w-8 h-8 rounded-full bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] flex items-center justify-center shadow-md shrink-0">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
