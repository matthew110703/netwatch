'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { EmbeddedPlayer } from '@/modules/player/EmbeddedPlayer';
import { MediaInfoPanel } from '@/modules/media-detail/MediaInfoPanel';
import { CastSection } from '@/modules/media-detail/CastSection';
import { SeasonEpisodePicker } from '@/modules/media-detail/SeasonEpisodePicker';
import { MediaRail, MediaCard } from '@ripperdoc-chrome77/components';
import { PlayerEpisode } from '@ripperdoc-chrome77/player';
import { MediaItem, Episode, CastMember, MediaCardModel, TMDBTvSeasonSummary } from '@/lib/types';
import { getTmdbImageUrl } from '@/lib/tmdb-image';

export interface WatchViewContainerProps {
  initialItem: MediaItem;
  mediaType: 'movie' | 'tv';
  id: string | number;
  initialSeason?: number;
  initialEpisode?: number;
  cast?: CastMember[];
  episodes?: Episode[];
  recommendations?: MediaCardModel[];
}

function mapEpisodesForPlayer(episodes: Episode[], fallbackSeason: number): PlayerEpisode[] {
  return episodes.map((ep) => ({
    id: ep.id,
    seasonNumber: ep.season_number ?? fallbackSeason,
    episodeNumber: ep.episode_number,
    title: ep.name,
    overview: ep.overview,
    stillPath:
      ep.stillUrl ||
      (ep.still_path ? getTmdbImageUrl(ep.still_path, 'w500') : undefined) ||
      undefined,
    durationMinutes: ep.runtime,
    airDate: ep.air_date,
  }));
}

export const WatchViewContainer: React.FC<WatchViewContainerProps> = ({
  initialItem,
  mediaType,
  id,
  initialSeason = 1,
  initialEpisode = 1,
  cast,
  episodes: initialEpisodes,
  recommendations = [],
}) => {
  const router = useRouter();
  const [season, setSeason] = useState<number>(initialSeason);
  const [episode, setEpisode] = useState<number>(initialEpisode);
  const [seasonEpisodesMap, setSeasonEpisodesMap] = useState<Record<string, Episode[]>>({});
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const seasonAbortRef = useRef<AbortController | null>(null);

  const isTv = mediaType === 'tv';
  const numId = typeof id === 'number' ? id : parseInt(String(id), 10);

  useEffect(() => {
    return () => {
      seasonAbortRef.current?.abort();
    };
  }, []);

  const positiveSeasons = useMemo<TMDBTvSeasonSummary[]>(() => {
    if (initialItem.seasons && initialItem.seasons.length > 0) {
      return initialItem.seasons.filter((s) => s.season_number > 0);
    }
    if (initialItem.number_of_seasons && initialItem.number_of_seasons > 0) {
      return Array.from({ length: initialItem.number_of_seasons }, (_, idx) => ({
        season_number: idx + 1,
        name: `Season ${idx + 1}`,
      }));
    }
    return [];
  }, [initialItem.seasons, initialItem.number_of_seasons]);

  const activeSeasonKey = `${numId}:${season}`;
  const episodeList = useMemo(
    () =>
      seasonEpisodesMap[activeSeasonKey] ??
      (season === initialSeason ? initialEpisodes || [] : []),
    [seasonEpisodesMap, activeSeasonKey, season, initialSeason, initialEpisodes]
  );

  const fetchSeasonEpisodes = useCallback(
    async (seasonNumber: number) => {
      if (!isTv || !numId || Number.isNaN(numId)) return;

      const cacheKey = `${numId}:${seasonNumber}`;
      if (
        seasonEpisodesMap[cacheKey] ||
        (seasonNumber === initialSeason && initialEpisodes && initialEpisodes.length > 0)
      ) {
        return;
      }

      seasonAbortRef.current?.abort();
      const controller = new AbortController();
      seasonAbortRef.current = controller;
      setEpisodesLoading(true);

      try {
        const res = await fetch(`/api/tv/${numId}/season/${seasonNumber}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        const eps: Episode[] =
          res.ok && json?.success && Array.isArray(json.data?.episodes)
            ? json.data.episodes.map((ep: Episode) => ({
                ...ep,
                season_number: ep.season_number ?? seasonNumber,
              }))
            : [];
        setSeasonEpisodesMap((prev) => ({
          ...prev,
          [cacheKey]: eps,
        }));
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setSeasonEpisodesMap((prev) => ({
          ...prev,
          [cacheKey]: [],
        }));
      } finally {
        setEpisodesLoading(false);
      }
    },
    [isTv, numId, seasonEpisodesMap, initialSeason, initialEpisodes]
  );

  const handleSelectEpisode = useCallback(
    (s: number, ep: number) => {
      setSeason(s);
      setEpisode(ep);
      router.replace(`/watch/${mediaType}/${id}?s=${s}&e=${ep}`, { scroll: false });
      if (s !== season) {
        fetchSeasonEpisodes(s);
      }
    },
    [router, mediaType, id, season, fetchSeasonEpisodes]
  );

  const handleSeasonChange = useCallback(
    (seasonNumber: number) => {
      setSeason(seasonNumber);
      setEpisode(1);
      router.replace(`/watch/${mediaType}/${id}?s=${seasonNumber}&e=1`, { scroll: false });
      fetchSeasonEpisodes(seasonNumber);
    },
    [router, mediaType, id, fetchSeasonEpisodes]
  );

  const detailPath = `/${mediaType}/${id}`;

  const handleMediaEnded = useCallback(() => {
    if (isTv) {
      const nextEp = episodeList.find((ep) => ep.episode_number === episode + 1);
      if (nextEp) {
        handleSelectEpisode(season, nextEp.episode_number);
        return;
      }
      const nextSeason = positiveSeasons.find((s) => s.season_number > season);
      if (nextSeason) {
        handleSeasonChange(nextSeason.season_number);
        return;
      }
    }
    router.push(detailPath);
  }, [
    isTv,
    episodeList,
    episode,
    season,
    positiveSeasons,
    handleSelectEpisode,
    handleSeasonChange,
    router,
    detailPath,
  ]);

  const filteredRecommendations = useMemo(
    () => recommendations.filter((rec) => String(rec.id) !== String(id)),
    [recommendations, id]
  );

  return (
    <div className="w-full min-h-screen max-w-[1440px] mx-auto px-4 md:px-12 pt-3 md:pt-4 pb-16 space-y-8">
      <EmbeddedPlayer
        mediaType={mediaType}
        id={id}
        season={season}
        episode={episode}
        title={initialItem.title || initialItem.name}
        overview={initialItem.overview}
        poster={initialItem.backdropUrl || initialItem.posterUrl}
        onExit={() => router.replace(detailPath)}
        onEnded={handleMediaEnded}
        servers={
          initialItem.servers && initialItem.servers.length > 0
            ? initialItem.servers.map((s) => ({
                id: s.id,
                name: s.name,
                quality: s.quality,
                isRecommended: s.isRecommended,
                embedUrl: s.embedUrl,
              }))
            : undefined
        }
        qualityBadge={
          initialItem.servers?.find((s) => s.isRecommended)?.quality ||
          initialItem.servers?.[0]?.quality
        }
        seasons={
          positiveSeasons.length > 0
            ? positiveSeasons.map((s) => ({
                seasonNumber: s.season_number,
                name: s.name,
                episodeCount: s.episode_count,
              }))
            : undefined
        }
        episodes={mapEpisodesForPlayer(episodeList, season)}
        episodesLoading={episodesLoading}
        onSelectEpisode={handleSelectEpisode}
        onSeasonChange={handleSeasonChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 min-w-0 space-y-8">
          <MediaInfoPanel item={initialItem} />

          {isTv && (
            <SeasonEpisodePicker
              currentSeason={season}
              currentEpisode={episode}
              seasons={positiveSeasons}
              episodes={episodeList}
              isLoading={episodesLoading}
              onSelectEpisode={handleSelectEpisode}
              onSeasonChange={handleSeasonChange}
            />
          )}

          <CastSection cast={cast} />
        </div>

        <div className="space-y-6 min-w-0">
          <div className="p-5 rounded-xl bg-[var(--rd-color-surface-container)] border border-[var(--rd-color-outline-variant)]/35 space-y-4">
            <h2 className="font-semibold text-sm text-[var(--rd-color-on-surface)]">
              Stream Specifications
            </h2>
            <div className="space-y-2.5 text-xs text-[var(--rd-color-on-surface-variant)]">
              <div className="flex justify-between py-1 border-b border-[var(--rd-color-outline-variant)]/30">
                <span>Source ID</span>
                <span className="text-[var(--rd-color-on-surface)] font-mono">TMDB #{id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--rd-color-outline-variant)]/30">
                <span>Type</span>
                <span className="text-[var(--rd-color-on-surface)] uppercase font-mono">
                  {mediaType}
                </span>
              </div>
              {isTv && (
                <div className="flex justify-between py-1">
                  <span>Episode</span>
                  <span className="text-[var(--rd-color-on-surface)] font-mono">
                    S{season} : E{episode}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {filteredRecommendations.length > 0 && (
        <div className="pt-8 border-t border-[var(--rd-color-outline-variant)]/30">
          <MediaRail
            title="More Like This"
            subtitle="Titles sharing similar genres and ratings"
          >
            {filteredRecommendations.map((rec) => (
              <MediaCard
                key={`${rec.type}-${rec.id}`}
                id={rec.id}
                title={rec.title}
                posterUrl={rec.imageUrl}
                backdropUrl={rec.backdropUrl}
                badge={rec.badge}
                rating={rec.rating}
                year={rec.year}
                meta={rec.meta}
                matchPercentage={
                  rec.rating && rec.rating > 0
                    ? Math.min(99, Math.max(50, Math.round(rec.rating * 10)))
                    : undefined
                }
                href={`/watch/${rec.type}/${rec.id}`}
                onClick={() => router.push(`/watch/${rec.type}/${rec.id}`)}
              />
            ))}
          </MediaRail>
        </div>
      )}
    </div>
  );
};
