'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Check, Share2 } from 'lucide-react';
import { MediaCardModel, MediaItem } from '@/lib/types';
import { useWatchlist } from '@/context/WatchlistContext';
import { formatDuration, formatReleaseYear, calculateMatchScore } from './media-detail.helper';

export interface MediaInfoPanelProps {
  item: MediaItem;
}

export const MediaInfoPanel: React.FC<MediaInfoPanelProps> = ({ item }) => {
  const { isSaved, toggleWatchlist } = useWatchlist();
  const [copied, setCopied] = useState(false);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    };
  }, []);

  const matchScore = calculateMatchScore(item.vote_average);
  const year = formatReleaseYear(item.release_date || item.first_air_date);
  const runtimeStr = formatDuration(item.runtime);
  const isAdult = Boolean((item as { adult?: boolean }).adult);
  const mediaType: 'movie' | 'tv' =
    item.media_type === 'tv' || (!item.release_date && Boolean(item.first_air_date))
      ? 'tv'
      : 'movie';
  const numericId = Number(item.id);
  const saved = Number.isInteger(numericId) && numericId > 0 ? isSaved(numericId, mediaType) : false;

  const watchlistPayload: MediaCardModel = {
    id: numericId,
    type: mediaType,
    title: item.title || item.name || '',
    meta: `${mediaType === 'tv' ? 'Series' : 'Feature Film'}${year ? ` • ${year}` : ''}`,
    imageUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    rating: item.vote_average,
    overview: item.overview,
    year,
  };

  const handleShare = async () => {
    const shareTitle = item.title || item.name || 'Netwatch';
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: item.overview || `Watch ${shareTitle} on Netwatch`,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      shareTimerRef.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked in restricted browser contexts
    }
  };

  return (
    <div className="flex flex-col gap-4 text-[var(--rd-color-on-surface)]">
      {/* Title */}
      <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
        {item.title || item.name}
      </h1>

      {/* Metadata Readout */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--rd-color-on-surface-variant)] font-medium">
        {matchScore > 0 && (
          <span className="text-[var(--rd-color-primary)] font-bold font-mono">
            {matchScore}% Match
          </span>
        )}
        {year && <span className="font-mono">{year}</span>}
        {isAdult && (
          <span className="px-2 py-0.5 border border-[var(--rd-color-outline-variant)] rounded text-[10px] font-bold">
            18+
          </span>
        )}
        {runtimeStr && <span className="font-mono">{runtimeStr}</span>}
        {item.vote_average > 0 && (
          <span className="text-amber-600 dark:text-amber-300 font-bold font-mono">
            ★ {item.vote_average.toFixed(1)}
          </span>
        )}
      </div>

      {/* Genres Pills */}
      {item.genres && item.genres.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {item.genres.map((genre) => (
            <span
              key={genre.id}
              className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40"
            >
              {genre.name}
            </span>
          ))}
        </div>
      )}

      {/* Synopsis */}
      {item.overview && (
        <p className="text-sm md:text-base text-[var(--rd-color-on-surface-variant)] leading-relaxed max-w-3xl">
          {item.overview}
        </p>
      )}

      {/* Action Row */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            if (Number.isInteger(numericId) && numericId > 0) {
              toggleWatchlist(watchlistPayload);
            }
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
            saved
              ? 'bg-[var(--rd-color-primary)]/15 text-[var(--rd-color-primary)] border-[var(--rd-color-primary)]/50'
              : 'bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border-[var(--rd-color-outline-variant)]/40 hover:bg-[var(--rd-color-surface-container-highest)]'
          }`}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{saved ? 'In My List' : 'Add to My List'}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 hover:bg-[var(--rd-color-surface-container-highest)] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
