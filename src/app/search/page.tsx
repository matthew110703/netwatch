'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  Play,
  Plus,
  Check,
  Star,
  Film,
  Tv,
  Loader2,
  Info,
  Sparkles,
} from 'lucide-react';
import { MediaCardModel } from '@/lib/types';
import { useWatchlist } from '@/context/WatchlistContext';

type SearchCategory = 'all' | 'movie' | 'tv' | 'anime';

interface SearchResultState {
  key: string;
  results: MediaCardModel[];
  page: number;
  totalPages: number;
  totalResults: number;
}

function parseCategory(raw: string | null): SearchCategory {
  if (raw === 'movie' || raw === 'tv' || raw === 'anime') return raw;
  return 'all';
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSaved, toggleWatchlist } = useWatchlist();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(() =>
    parseCategory(searchParams.get('type'))
  );
  const [searchState, setSearchState] = useState<SearchResultState>({
    key: '',
    results: [],
    page: 1,
    totalPages: 1,
    totalResults: 0,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  const trimmedQuery = query.trim();
  const searchKey = `${activeCategory}:${trimmedQuery}`;
  const isCurrentKey = Boolean(trimmedQuery && searchState.key === searchKey);
  const results = isCurrentKey ? searchState.results : [];
  const currentPage = isCurrentKey ? searchState.page : 1;
  const totalPages = isCurrentKey ? searchState.totalPages : 1;
  const totalResults = isCurrentKey ? searchState.totalResults : 0;
  const isSearching = Boolean(trimmedQuery && !isCurrentKey);

  useEffect(() => {
    return () => {
      loadMoreAbortRef.current?.abort();
    };
  }, []);

  // Debounced live search + URL synchronization
  useEffect(() => {
    const currentUrlQ = searchParams.get('q') || '';
    const currentUrlType = parseCategory(searchParams.get('type'));

    if (!trimmedQuery) {
      const clearTimer = setTimeout(() => {
        if (currentUrlQ || currentUrlType !== 'all') {
          router.replace('/search', { scroll: false });
        }
      }, 200);
      return () => clearTimeout(clearTimer);
    }

    if ((activeCategory === 'anime' || activeCategory === 'all') && trimmedQuery.length < 2) {
      setSearchState({
        key: searchKey,
        results: [],
        page: 1,
        totalPages: 1,
        totalResults: 0,
      });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (trimmedQuery !== currentUrlQ || activeCategory !== currentUrlType) {
        const nextUrl = `/search?q=${encodeURIComponent(trimmedQuery)}&type=${activeCategory}`;
        router.replace(nextUrl, { scroll: false });
      }

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&type=${activeCategory}&page=1`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setSearchState({
            key: searchKey,
            results: [],
            page: 1,
            totalPages: 1,
            totalResults: 0,
          });
          return;
        }
        const json = await res.json();
        const items: MediaCardModel[] = Array.isArray(json.data) ? json.data : [];
        setSearchState({
          key: searchKey,
          results: items,
          page: typeof json.page === 'number' ? json.page : 1,
          totalPages: typeof json.totalPages === 'number' ? json.totalPages : 1,
          totalResults:
            typeof json.totalResults === 'number' ? json.totalResults : items.length,
        });
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('[SearchPage] Query failed:', err);
          setSearchState({
            key: searchKey,
            results: [],
            page: 1,
            totalPages: 1,
            totalResults: 0,
          });
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, activeCategory, searchKey, router, searchParams]);

  const handleLoadMore = async () => {
    if (!trimmedQuery || isLoadingMore || currentPage >= totalPages) return;

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmedQuery)}&type=${activeCategory}&page=${nextPage}`,
        { signal: controller.signal }
      );
      if (!res.ok) return;
      const json = await res.json();
      const incoming: MediaCardModel[] = Array.isArray(json.data) ? json.data : [];

      setSearchState((prev) => {
        if (prev.key !== searchKey) return prev;
        const existingKeys = new Set(
          prev.results.map((item) => `${item.type}:${item.id}`)
        );
        const deduped = incoming.filter(
          (item) => !existingKeys.has(`${item.type}:${item.id}`)
        );
        return {
          key: prev.key,
          results: [...prev.results, ...deduped],
          page: typeof json.page === 'number' ? json.page : nextPage,
          totalPages:
            typeof json.totalPages === 'number' ? json.totalPages : prev.totalPages,
          totalResults:
            typeof json.totalResults === 'number'
              ? json.totalResults
              : prev.totalResults,
        };
      });
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('[SearchPage] Load more failed:', err);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const topMatches = results.slice(0, 3);
  const remainingMatches = results.slice(3);

  return (
    <div className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] pt-8 pb-24 px-4 sm:px-6 md:px-12 max-w-[1440px] mx-auto">
      <h1 className="sr-only">Search Movies and TV Shows on Netwatch</h1>
      {/* Search Input Header */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 sm:pl-6 flex items-center pointer-events-none">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--rd-color-on-surface-variant)] group-focus-within:text-[var(--rd-color-primary)] transition-colors" />
          </div>

          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows..."
            className="w-full bg-[var(--rd-color-surface-container-high)] border border-[var(--rd-color-outline-variant)]/40 rounded-2xl py-4 sm:py-5 pl-12 sm:pl-16 pr-12 text-lg sm:text-2xl font-bold text-[var(--rd-color-on-surface)] placeholder:text-[var(--rd-color-on-surface-variant)]/50 outline-none focus:border-[var(--rd-color-primary)] focus:ring-2 focus:ring-[var(--rd-color-primary)]/30 transition-all shadow-md"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-4 sm:pr-6 flex items-center text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] transition-colors cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
                : 'bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)]'
            }`}
          >
            All Matches
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('movie')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeCategory === 'movie'
                ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
                : 'bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)]'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Movies</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('tv')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeCategory === 'tv'
                ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
                : 'bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)]'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>TV Shows</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('anime')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeCategory === 'anime'
                ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm'
                : 'bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Anime</span>
          </button>

          {isSearching && (
            <div className="flex items-center gap-2 ml-auto text-[var(--rd-color-primary)] text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning catalog...</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: TOP MATCHES */}
      {topMatches.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--rd-color-on-surface)] mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-[var(--rd-color-primary)] fill-current" />
            <span>Top Matches</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {topMatches.map((item) => {
              const saved = isSaved(item.id, item.type);
              const matchLabel =
                item.badge ||
                (item.rating && item.rating > 0
                  ? `${Math.min(99, Math.max(50, Math.round(item.rating * 10)))}% MATCH`
                  : item.type.toUpperCase());

              const detailHref =
                item.type === 'anime' ? `/anime/${item.id}` : `/${item.type}/${item.id}`;
              const watchHref =
                item.type === 'anime'
                  ? `/watch/anime/${item.id}/1`
                  : `/watch/${item.type}/${item.id}`;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => router.push(detailHref)}
                  className="group relative flex flex-row gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-[var(--rd-color-surface-container-high)] border border-[var(--rd-color-outline-variant)]/35 hover:border-[var(--rd-color-primary)]/50 transition-all cursor-pointer shadow-md hover:shadow-xl"
                >
                  <div className="w-24 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden shrink-0 bg-[var(--rd-color-surface-container-highest)] relative">
                    {item.imageUrl ? (
                      <img
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src={item.imageUrl}
                      />
                    ) : null}
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-[var(--rd-color-primary)] truncate">
                          {matchLabel}
                        </span>
                        {item.year && (
                          <span className="text-xs font-mono text-[var(--rd-color-on-surface-variant)] shrink-0">
                            {item.year}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-[var(--rd-color-on-surface)] text-base sm:text-lg group-hover:text-[var(--rd-color-primary)] transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[var(--rd-color-on-surface-variant)] line-clamp-2 leading-relaxed">
                        {item.overview || item.meta}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(watchHref);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] font-semibold text-xs inline-flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </button>

                      <Link
                        href={detailHref}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2 rounded-lg bg-[var(--rd-color-surface-container-low)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 hover:bg-[var(--rd-color-surface-container-highest)] font-semibold text-xs inline-flex items-center gap-1 transition-all"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(item);
                        }}
                        aria-label={saved ? 'Remove from My List' : 'Add to My List'}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          saved
                            ? 'bg-[var(--rd-color-primary)]/15 text-[var(--rd-color-primary)] border-[var(--rd-color-primary)]/50'
                            : 'bg-[var(--rd-color-surface-container-low)] text-[var(--rd-color-on-surface)] border-[var(--rd-color-outline-variant)]/40 hover:bg-[var(--rd-color-surface-container-highest)]'
                        }`}
                      >
                        {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: ALL RESULTS GRID */}
      {remainingMatches.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--rd-color-on-surface)]">
              Explore All Results ({totalResults > results.length ? `${results.length} of ${totalResults}` : results.length})
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {remainingMatches.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.type === 'anime' ? `/anime/${item.id}` : `/${item.type}/${item.id}`}
                className="group relative rounded-xl overflow-hidden aspect-[2/3] bg-[var(--rd-color-surface-container-high)] border border-[var(--rd-color-outline-variant)]/30 hover:border-[var(--rd-color-primary)]/50 transition-all shadow-md hover:scale-[1.03]"
              >
                {item.imageUrl ? (
                  <img
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src={item.imageUrl}
                  />
                ) : null}

                {/* Readable on touchscreens + polished hover state on desktop */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="font-bold text-white text-sm truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase">
                      {item.badge || item.year || item.type}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] flex items-center justify-center shrink-0">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {currentPage < totalPages && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--rd-color-surface-container-high)] hover:bg-[var(--rd-color-surface-container-highest)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/50 font-semibold text-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isLoadingMore ? 'Loading more...' : 'Load More Results'}</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Load More when total <= 3 wouldn't need grid, but handle edge case if backend returns <=3 per page */}
      {topMatches.length > 0 && remainingMatches.length === 0 && currentPage < totalPages && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--rd-color-surface-container-high)] hover:bg-[var(--rd-color-surface-container-highest)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/50 font-semibold text-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isLoadingMore ? 'Loading more...' : 'Load More Results'}</span>
          </button>
        </div>
      )}

      {/* Empty State / Quick Discovery Chips */}
      {results.length === 0 && !isSearching && (
        <div className="py-16 text-center space-y-6">
          <Film className="w-14 h-14 text-[var(--rd-color-on-surface-variant)]/40 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-[var(--rd-color-on-surface)]">
              {trimmedQuery ? `No titles matched "${trimmedQuery}"` : 'Search Netwatch Catalog'}
            </h3>
            <p className="text-[var(--rd-color-on-surface-variant)] max-w-md mx-auto text-sm">
              {trimmedQuery
                ? 'Please check your spelling, switch categories, or search for another movie or TV show.'
                : 'Search movies or TV series across TMDB. Try a quick query below:'}
            </p>
          </div>

          {!trimmedQuery && (
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto pt-2">
              {['Spider-Man', 'Batman', 'Dune', 'Severance', 'Oppenheimer', 'Inception'].map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuery(tag)}
                    className="px-4 py-1.5 rounded-full bg-[var(--rd-color-surface-container-high)] border border-[var(--rd-color-outline-variant)]/40 text-xs font-mono text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-primary)] hover:border-[var(--rd-color-primary)] transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--rd-color-surface)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--rd-color-primary)] animate-spin" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
