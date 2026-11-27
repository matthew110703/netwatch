'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Film, Tv, Play, Trash2, Info, History } from 'lucide-react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { MediaCardModel } from '@/lib/types';

export default function WatchlistPage() {
  const router = useRouter();
  const { watchlistItems, isLoading, toggleWatchlist } = useWatchlist();
  const {
    items: historyItems,
    isLoading: historyLoading,
    removeFromHistory,
  } = useWatchHistory({ limit: 48 });
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');

  const filteredHistory = useMemo(() => {
    if (filter === 'all') return historyItems;
    return historyItems.filter((item) => item.type === filter);
  }, [historyItems, filter]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return watchlistItems;
    return watchlistItems.filter((item) => item.type === filter);
  }, [watchlistItems, filter]);

  const handleOpenPreview = (item: MediaCardModel) => {
    window.dispatchEvent(new CustomEvent('open-netwatch-preview', { detail: item }));
  };

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
      active
        ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
        : 'bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)]'
    }`;

  return (
    <div className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] pt-8 pb-24 px-4 sm:px-6 md:px-12 max-w-[1440px] mx-auto font-body-md">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--rd-color-outline-variant)]/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-[var(--rd-color-primary)]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My List</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--rd-color-surface-container-high)] text-xs font-mono font-bold text-[var(--rd-color-primary)]">
              {watchlistItems.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--rd-color-on-surface-variant)]">
            Watch history and saved titles for this device session.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <button type="button" onClick={() => setFilter('all')} className={tabCls(filter === 'all')}>
            All ({watchlistItems.length})
          </button>
          <button type="button" onClick={() => setFilter('movie')} className={tabCls(filter === 'movie')}>
            <Film className="w-3.5 h-3.5" />
            <span>Movies ({watchlistItems.filter((i) => i.type === 'movie').length})</span>
          </button>
          <button type="button" onClick={() => setFilter('tv')} className={tabCls(filter === 'tv')}>
            <Tv className="w-3.5 h-3.5" />
            <span>TV Shows ({watchlistItems.filter((i) => i.type === 'tv').length})</span>
          </button>
        </div>
      </div>

      {/* Watch History */}
      <section className="mt-8 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[var(--rd-color-primary)]" />
          <h2 className="text-lg font-bold">Watch History</h2>
          <span className="text-xs font-mono text-[var(--rd-color-on-surface-variant)]">
            ({historyItems.length})
          </span>
        </div>
        {historyLoading && filteredHistory.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={`hist-skel-${n}`}
                className="aspect-[2/3] rounded-xl bg-[var(--rd-color-surface-container-high)]"
              />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <p className="text-sm text-[var(--rd-color-on-surface-variant)] py-6">
            Titles you play will show up here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {filteredHistory.map((item) => (
              <div
                key={`hist-${item.type}-${item.id}`}
                className="group relative flex flex-col rounded-xl overflow-hidden bg-[var(--rd-color-surface-container)] border border-[var(--rd-color-outline-variant)]/35 hover:border-[var(--rd-color-primary)]/60 transition-all shadow-sm"
              >
                <div
                  onClick={() => handleOpenPreview(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenPreview(item);
                    }
                  }}
                  className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {typeof item.progress === 'number' && item.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <div
                        className="h-full bg-[var(--rd-color-primary)]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeFromHistory(item);
                    }}
                    aria-label={`Remove ${item.title} from history`}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-[var(--rd-color-on-surface-variant)] line-clamp-1">
                    {item.episodeInfo || item.meta}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.type === 'tv' && item.resumeSeason && item.resumeEpisode) {
                        router.push(
                          `/watch/tv/${item.id}?s=${item.resumeSeason}&e=${item.resumeEpisode}`
                        );
                      } else {
                        router.push(`/watch/${item.type}/${item.id}`);
                      }
                    }}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] text-xs font-bold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {item.progress && item.progress > 0 && item.progress < 95 ? 'Resume' : 'Watch'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved */}
      <section className="mt-12 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--rd-color-outline-variant)]/25">
          <Bookmark className="w-5 h-5 text-[var(--rd-color-primary)]" />
          <h2 className="text-lg font-bold">Saved</h2>
          <span className="text-xs font-mono text-[var(--rd-color-on-surface-variant)]">
            ({watchlistItems.length})
          </span>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8 animate-pulse">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="aspect-[2/3] rounded-xl bg-[var(--rd-color-surface-container-high)]"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center space-y-5 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-[var(--rd-color-surface-container-high)] flex items-center justify-center mx-auto text-[var(--rd-color-primary)]">
            <Bookmark className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">
              {watchlistItems.length === 0 ? 'Your list is empty' : `No ${filter === 'tv' ? 'TV shows' : 'movies'} saved`}
            </h2>
            <p className="text-sm text-[var(--rd-color-on-surface-variant)]">
              Add movies and series as you browse to keep track of everything you want to watch next.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/movies"
              className="px-5 py-2.5 rounded-xl bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Browse Movies
            </Link>
            <Link
              href="/tv"
              className="px-5 py-2.5 rounded-xl bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/50 font-semibold text-sm hover:bg-[var(--rd-color-surface-container-highest)] transition-colors"
            >
              Browse TV Shows
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 mt-4">
          {filteredItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="group relative flex flex-col rounded-xl overflow-hidden bg-[var(--rd-color-surface-container)] border border-[var(--rd-color-outline-variant)]/35 hover:border-[var(--rd-color-primary)]/60 transition-all shadow-sm hover:shadow-xl"
            >
              <div
                onClick={() => handleOpenPreview(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenPreview(item);
                  }
                }}
                aria-label={`Preview ${item.title}`}
                className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--rd-color-surface-container-high)] cursor-pointer"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold uppercase tracking-wider">
                  {item.type === 'tv' ? 'TV' : 'Movie'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleWatchlist(item);
                  }}
                  aria-label={`Remove ${item.title} from My List`}
                  title="Remove from My List"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 flex flex-col gap-2 flex-1 justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[var(--rd-color-on-surface)] line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--rd-color-on-surface-variant)] line-clamp-1 mt-0.5">
                    {item.meta}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => router.push(`/watch/${item.type}/${item.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch</span>
                  </button>
                  <Link
                    href={`/${item.type}/${item.id}`}
                    aria-label={`Details for ${item.title}`}
                    title="Full Details"
                    className="w-8 h-8 rounded-lg bg-[var(--rd-color-surface-container-high)] hover:bg-[var(--rd-color-surface-container-highest)] text-[var(--rd-color-on-surface)] flex items-center justify-center border border-[var(--rd-color-outline-variant)]/40 transition-colors shrink-0"
                  >
                    <Info className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
