'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Film } from 'lucide-react';
import { MediaCard } from '@ripperdoc-chrome77/components';
import { MediaCardModel, TMDBGenre } from '@/lib/types';

interface GenreFilterSectionProps {
  genres: TMDBGenre[];
  mediaType: 'movie' | 'tv' | 'all';
  onSelectCard: (item: MediaCardModel) => void;
}

export const GenreFilterSection: React.FC<GenreFilterSectionProps> = ({
  genres,
  mediaType,
  onSelectCard,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<TMDBGenre>(
    genres[0] || { id: 0, name: 'All Genres' }
  );
  const [filteredItems, setFilteredItems] = useState<MediaCardModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isFiltering = selectedGenre.id !== 0;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSelectGenre = async (genre: TMDBGenre) => {
    setSelectedGenre(genre);
    abortRef.current?.abort();

    if (genre.id === 0) {
      setFilteredItems([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setHasError(false);

    try {
      const res = await fetch(
        `/api/discover?type=${mediaType}&genreId=${genre.id}&page=1`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { success?: boolean; data?: MediaCardModel[] };
      if (!controller.signal.aborted) {
        setFilteredItems(Array.isArray(json.data) ? json.data : []);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setHasError(true);
        setFilteredItems([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  if (genres.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-2">
        {genres.map((genre) => {
          const isActive = selectedGenre.id === genre.id;
          return (
            <button
              key={`${genre.id}-${genre.name}`}
              type="button"
              onClick={() => void handleSelectGenre(genre)}
              aria-pressed={isActive}
              className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus)] ${
                isActive
                  ? 'bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] border-[var(--rd-color-primary)] shadow-md'
                  : 'bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface-variant)] border-[var(--rd-color-outline-variant)]/40 hover:text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-highest)]'
              }`}
            >
              {genre.name}
            </button>
          );
        })}
      </div>

      {isFiltering && (
        <section className="space-y-4 rounded-2xl p-4 sm:p-5 bg-[var(--rd-color-surface-container-low)] border border-[var(--rd-color-outline-variant)]/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--rd-color-on-surface)] tracking-tight">
                {selectedGenre.name}
              </h2>
              <p className="text-xs text-[var(--rd-color-on-surface-variant)]">
                Live catalog matches
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSelectGenre({ id: 0, name: 'All Genres' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--rd-color-surface-container-high)] hover:bg-[var(--rd-color-surface-container-highest)] text-xs font-semibold text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="aspect-[2/3] rounded-lg bg-[var(--rd-color-surface-container-high)]"
                />
              ))}
            </div>
          ) : hasError || filteredItems.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-[var(--rd-color-on-surface-variant)]">
              <Film className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-sm font-medium">
                {hasError
                  ? 'Unable to load genre titles right now.'
                  : `No ${selectedGenre.name} titles found.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {filteredItems.slice(0, 12).map((item) => (
                <MediaCard
                  key={`genre-${item.type}-${item.id}`}
                  id={item.id}
                  title={item.title}
                  posterUrl={item.imageUrl}
                  backdropUrl={item.backdropUrl}
                  rating={item.rating}
                  year={item.year}
                  variant="poster"
                  badge={item.badge}
                  href={`/${item.type}/${item.id}`}
                  onClick={() => onSelectCard(item)}
                  className="w-full min-w-0"
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
