'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Play,
  Plus,
  Check,
  Info,
  Film,
  Tv,
  Sparkles,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { MediaCardModel } from '@/lib/types';
import { useWatchlist } from '@/context/WatchlistContext';

interface FullScreenSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreview: (item: MediaCardModel) => void;
}

const TRENDING_SUGGESTIONS = [
  'Batman',
  'Dune',
  'Severance',
  'Oppenheimer',
  'Spider-Man',
  'Inception',
  'Interstellar',
];

export const FullScreenSearchModal: React.FC<FullScreenSearchModalProps> = ({
  isOpen,
  onClose,
  onOpenPreview,
}) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv' | 'anime'>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchState, setSearchState] = useState<{
    key: string;
    results: MediaCardModel[];
    totalResults: number;
  }>({
    key: '',
    results: [],
    totalResults: 0,
  });

  const { isSaved, toggleWatchlist } = useWatchlist();

  const handleClose = useCallback(() => {
    setQuery('');
    setHighlightedIndex(-1);
    onClose();
  }, [onClose]);

  const trimmedQuery = query.trim();
  const searchKey = `${activeTab}:${trimmedQuery}`;
  const results =
    trimmedQuery && searchState.key === searchKey ? searchState.results : [];
  const totalResults =
    trimmedQuery && searchState.key === searchKey ? searchState.totalResults : 0;
  const isSearching = Boolean(
    isOpen && trimmedQuery && searchState.key !== searchKey
  );
  const activeIndex =
    highlightedIndex >= 0 && highlightedIndex < results.length
      ? highlightedIndex
      : -1;

  // Focus input on open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Global Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Debounced search query with cancellation
  useEffect(() => {
    if (!isOpen || !trimmedQuery) return;
    if ((activeTab === 'anime' || activeTab === 'all') && trimmedQuery.length < 2) {
      setSearchState({ key: searchKey, results: [], totalResults: 0 });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&type=${activeTab}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setSearchState({ key: searchKey, results: [], totalResults: 0 });
          return;
        }
        const json = await res.json();
        const items: MediaCardModel[] = Array.isArray(json.data) ? json.data : [];
        setSearchState({
          key: searchKey,
          results: items,
          totalResults:
            typeof json.totalResults === 'number' ? json.totalResults : items.length,
        });
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('[SearchModal] Failed to fetch results:', err);
          setSearchState({ key: searchKey, results: [], totalResults: 0 });
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, trimmedQuery, activeTab, searchKey]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? results.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        const selected = results[activeIndex];
        handleClose();
        if (selected.type === 'anime') {
          router.push(`/anime/${selected.id}`);
        } else {
          onOpenPreview(selected);
        }
      } else if (trimmedQuery) {
        e.preventDefault();
        const target = `/search?q=${encodeURIComponent(trimmedQuery)}&type=${activeTab}`;
        handleClose();
        router.push(target);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search catalog"
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--rd-color-surface-container-lowest)]/95 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Header with Search Bar */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-8 pb-4">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--rd-color-outline-variant)]/40">
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <Search className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--rd-color-primary)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search titles, movies, TV series..."
              className="w-full min-w-0 bg-transparent text-lg sm:text-2xl md:text-3xl font-bold text-[var(--rd-color-on-surface)] placeholder:text-[var(--rd-color-on-surface-variant)]/50 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHighlightedIndex(-1);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] bg-[var(--rd-color-surface-container-high)]/70 hover:bg-[var(--rd-color-surface-container-highest)] transition-all cursor-pointer shrink-0"
                aria-label="Clear search input"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface-variant)] text-xs font-mono border border-[var(--rd-color-outline-variant)]/40">
              ESC
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-high)] transition-all cursor-pointer"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setHighlightedIndex(-1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
                : 'text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-high)]'
            }`}
          >
            All Content
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('movie');
              setHighlightedIndex(-1);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'movie'
                ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
                : 'text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-high)]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movies</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('tv');
              setHighlightedIndex(-1);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'tv'
                ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
                : 'text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-high)]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV Shows</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('anime');
              setHighlightedIndex(-1);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'anime'
                ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
                : 'text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-high)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Anime</span>
          </button>

          {trimmedQuery && results.length > 0 && !isSearching && (
            <Link
              href={`/search?q=${encodeURIComponent(trimmedQuery)}&type=${activeTab}`}
              onClick={handleClose}
              className="ml-auto inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--rd-color-primary)] hover:underline"
            >
              <span>See all {totalResults > results.length ? `${totalResults} ` : ''}results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {isSearching && (
            <div className="flex items-center gap-2 ml-auto text-[var(--rd-color-primary)] text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning catalog...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 pb-16">
        <div className="max-w-5xl mx-auto pt-4">
          {/* Case 1: Empty Query - Show Suggestions */}
          {!trimmedQuery && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--rd-color-on-surface-variant)] text-xs font-mono uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[var(--rd-color-primary)]" />
                <span>Trending Searches</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {TRENDING_SUGGESTIONS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      setHighlightedIndex(-1);
                    }}
                    className="px-4 py-2 rounded-full bg-[var(--rd-color-surface-container-high)] hover:bg-[var(--rd-color-surface-container-highest)] border border-[var(--rd-color-outline-variant)]/40 text-[var(--rd-color-on-surface)] text-sm transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Case 2: Query entered and has results */}
          {trimmedQuery && results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((item, idx) => {
                const saved = isSaved(item.id, item.type);
                const isHighlighted = idx === activeIndex;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      handleClose();
                      if (item.type === 'anime') {
                        router.push(`/anime/${item.id}`);
                      } else {
                        onOpenPreview(item);
                      }
                    }}
                    className={`group relative flex flex-col rounded-lg overflow-hidden bg-[var(--rd-color-surface-container-high)] border transition-all cursor-pointer hover:shadow-xl hover:scale-[1.02] ${
                      isHighlighted
                        ? 'border-[var(--rd-color-primary)] ring-2 ring-[var(--rd-color-primary)]/50'
                        : 'border-[var(--rd-color-outline-variant)]/30 hover:border-[var(--rd-color-primary)]/50'
                    }`}
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--rd-color-surface-container-highest)]">
                      {item.imageUrl ? (
                        <img
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          src={item.imageUrl}
                        />
                      ) : null}

                      {/* Quick Action Overlay on Hover */}
                      <div className="hidden sm:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex-col justify-between p-2">
                        <div className="flex justify-end gap-1 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(item);
                            }}
                            className="p-1.5 rounded-full bg-black/75 text-white hover:text-[var(--rd-color-primary)] transition-all cursor-pointer"
                            aria-label={
                              saved ? 'Remove from watchlist' : 'Add to watchlist'
                            }
                          >
                            {saved ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClose();
                              onOpenPreview(item);
                            }}
                            className="p-1.5 rounded-full bg-black/75 text-white hover:text-[var(--rd-color-primary)] transition-all cursor-pointer"
                            aria-label="Quick Preview"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex justify-center pb-2 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClose();
                              router.push(`/watch/${item.type}/${item.id}`);
                            }}
                            className="w-10 h-10 rounded-full bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform cursor-pointer"
                            aria-label={`Play ${item.title}`}
                          >
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </button>
                        </div>
                      </div>

                      {item.badge && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-black/75 backdrop-blur-sm text-white">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 space-y-0.5">
                      <h4 className="font-bold text-[var(--rd-color-on-surface)] truncate group-hover:text-[var(--rd-color-primary)] transition-colors text-sm">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[var(--rd-color-on-surface-variant)] truncate">
                        {item.meta}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Case 3: Query entered but 0 results */}
          {trimmedQuery && !isSearching && results.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <Film className="w-12 h-12 text-[var(--rd-color-on-surface-variant)]/40 mx-auto" />
              <h3 className="text-lg font-bold text-[var(--rd-color-on-surface)]">
                No titles matching &ldquo;{trimmedQuery}&rdquo;
              </h3>
              <p className="text-sm text-[var(--rd-color-on-surface-variant)] max-w-md mx-auto">
                Try searching for a different title, franchise, or switch between Movies and TV Shows.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
