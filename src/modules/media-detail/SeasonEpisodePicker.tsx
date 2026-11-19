'use client';

import React from 'react';
import { Select } from '@ripperdoc-chrome77/components';
import { Episode, TMDBTvSeasonSummary } from '@/lib/types';

export interface SeasonEpisodePickerProps {
  currentSeason: number;
  currentEpisode: number;
  seasons?: TMDBTvSeasonSummary[];
  episodes?: Episode[];
  isLoading?: boolean;
  onSelectEpisode: (season: number, episode: number) => void;
  onSeasonChange?: (seasonNumber: number) => void;
}

export const SeasonEpisodePicker: React.FC<SeasonEpisodePickerProps> = ({
  currentSeason,
  currentEpisode,
  seasons,
  episodes = [],
  isLoading = false,
  onSelectEpisode,
  onSeasonChange,
}) => {
  const showSeasonDropdown = Boolean(seasons && seasons.length > 1 && onSeasonChange);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--rd-color-on-surface)]">
          Episodes
        </h2>

        {showSeasonDropdown && seasons && onSeasonChange ? (
          <div className="flex items-center gap-2">
            <label
              id="watch-season-label"
              htmlFor="watch-season-select"
              className="text-xs font-mono text-[var(--rd-color-on-surface-variant)]"
            >
              Season:
            </label>
            <Select
              id="watch-season-select"
              size="sm"
              align="end"
              ariaLabelledBy="watch-season-label"
              value={String(currentSeason)}
              options={seasons.map((s) => ({
                value: String(s.season_number),
                label: s.name || `Season ${s.season_number}`,
                description: s.episode_count ? `${s.episode_count} episodes` : undefined,
              }))}
              onChange={(val) => onSeasonChange(Number(val))}
            />
          </div>
        ) : (
          <div className="text-xs font-semibold text-[var(--rd-color-primary)] bg-[var(--rd-color-surface-container-high)] px-3 py-1 rounded-full border border-[var(--rd-color-outline-variant)]/40">
            Season {currentSeason}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-lg bg-[var(--rd-color-surface-container)] border border-[var(--rd-color-outline-variant)]/30 animate-pulse"
            >
              <div className="aspect-video w-full bg-[var(--rd-color-surface-container-highest)]" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-3/4 rounded bg-[var(--rd-color-surface-container-highest)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--rd-color-surface-container-highest)]" />
              </div>
            </div>
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <p className="text-sm text-[var(--rd-color-on-surface-variant)]">
          No episode metadata is available for Season {currentSeason}.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {episodes.map((ep) => {
            const epSeason = ep.season_number ?? currentSeason;
            const isActive =
              epSeason === currentSeason && ep.episode_number === currentEpisode;

            return (
              <button
                type="button"
                key={ep.id || `${epSeason}-${ep.episode_number}`}
                onClick={() => onSelectEpisode(epSeason, ep.episode_number)}
                className={`group flex flex-col text-left overflow-hidden rounded-lg bg-[var(--rd-color-surface-container)] border transition-all cursor-pointer ${
                  isActive
                    ? 'border-[var(--rd-color-primary)] shadow-lg ring-1 ring-[var(--rd-color-primary)]/40'
                    : 'border-[var(--rd-color-outline-variant)]/35 hover:border-[var(--rd-color-outline-variant)]'
                }`}
              >
                {/* Still Thumbnail */}
                <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
                  {ep.stillUrl ? (
                    <img
                      src={ep.stillUrl}
                      alt={ep.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--rd-color-on-surface-variant)]">
                      No Preview
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/75 text-white backdrop-blur-sm">
                    EP {ep.episode_number}
                  </div>
                </div>

                {/* Title & Overview */}
                <div className="p-3 flex flex-col justify-between flex-1 w-full">
                  <div>
                    <h4 className="font-semibold text-xs text-[var(--rd-color-on-surface)] line-clamp-1 group-hover:text-[var(--rd-color-primary)] transition-colors">
                      {ep.name || `Episode ${ep.episode_number}`}
                    </h4>
                    {ep.overview && (
                      <p className="text-[11px] text-[var(--rd-color-on-surface-variant)] line-clamp-2 mt-1 leading-normal">
                        {ep.overview}
                      </p>
                    )}
                  </div>
                  {ep.runtime && ep.runtime > 0 ? (
                    <div className="mt-2 text-[10px] font-mono text-[var(--rd-color-on-surface-variant)]">
                      {ep.runtime} min
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
