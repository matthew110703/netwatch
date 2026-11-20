'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ServerSelector, StreamingServerOption } from '@ripperdoc-chrome77/components';
import {
  NetwatchPlayer,
  PlayerSeason,
  PlayerEpisode,
  PlayerSubtitleTrack,
  SubtitleSearchParams,
} from '@ripperdoc-chrome77/player';
import {
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { getClientDeviceId } from '@/lib/device';
import {
  buildStreamPrefsKey,
  getStreamPrefs,
  setStreamPrefs,
  type StreamPlaybackPrefs,
} from '@/lib/stream-preferences';
import {
  resolveDirectStreamFromEmbed,
  shouldProxyHls,
} from '@/lib/vidrift-stream';
import { buildServerStreamUrl, isNativeServer } from './player.helper';

export type StreamingServerWithEmbed = StreamingServerOption & { embedUrl?: string };

const DEFAULT_SERVERS: StreamingServerWithEmbed[] = [
  {
    id: 'native',
    name: 'Netwatch Direct HLS',
    quality: 'Adaptive HLS • Ad-Free',
    speed: '4ms',
    isRecommended: true,
  },
  {
    id: 'vidrift',
    name: 'VidRift Prime',
    quality: 'Adaptive HLS',
    speed: '12ms',
    isRecommended: false,
  },
];

/** Prefer Netwatch Direct; keep embeds available as secondary sources. */
function withNativePrimary(list: StreamingServerWithEmbed[]): StreamingServerWithEmbed[] {
  const native =
    list.find((s) => isNativeServer(s.id)) ||
    DEFAULT_SERVERS.find((s) => isNativeServer(s.id))!;
  const rest = list.filter((s) => !isNativeServer(s.id));
  return [
    { ...native, isRecommended: true },
    ...rest.map((s) => ({ ...s, isRecommended: false })),
  ];
}

export interface EmbeddedPlayerProps {
  mediaType: 'movie' | 'tv';
  id: number | string;
  season?: number;
  episode?: number;
  title?: string;
  overview?: string;
  poster?: string;
  servers?: StreamingServerWithEmbed[];
  seasons?: PlayerSeason[];
  episodes?: PlayerEpisode[];
  episodesLoading?: boolean;
  qualityBadge?: string;
  onSelectEpisode?: (seasonNumber: number, episodeNumber: number) => void;
  onSeasonChange?: (seasonNumber: number) => void;
  onExit?: () => void;
  onEnded?: () => void;
}

function mergeSubtitleTracks(
  primary: PlayerSubtitleTrack[],
  secondary: PlayerSubtitleTrack[]
): PlayerSubtitleTrack[] {
  const merged = primary.map((track) => {
    const enriched = secondary.find(
      (s) =>
        (Boolean(track.url) && s.url === track.url) ||
        s.label.toLowerCase() === track.label.toLowerCase()
    );
    if (enriched && !track.source && enriched.source) {
      return { ...track, source: enriched.source };
    }
    return track;
  });

  const seenUrls = new Set(merged.map((t) => t.url).filter(Boolean));
  const seenLabels = new Set(merged.map((t) => `${t.lang}:${t.label.toLowerCase()}`));

  for (const item of secondary) {
    const labelKey = `${item.lang}:${item.label.toLowerCase()}`;
    if ((item.url && seenUrls.has(item.url)) || seenLabels.has(labelKey)) continue;
    if (item.url) seenUrls.add(item.url);
    seenLabels.add(labelKey);
    merged.push(item);
  }

  return merged;
}

export const EmbeddedPlayer: React.FC<EmbeddedPlayerProps> = ({
  mediaType,
  id,
  season = 1,
  episode = 1,
  title,
  overview,
  poster,
  servers,
  seasons,
  episodes,
  episodesLoading = false,
  qualityBadge,
  onSelectEpisode,
  onSeasonChange,
  onExit,
  onEnded,
}) => {
  const [initialTarget] = useState(() => ({ season, episode }));
  const [resolvedServersMap, setResolvedServersMap] = useState<
    Record<string, StreamingServerWithEmbed[]>
  >({});

  const baseServers = useMemo(() => {
    const incoming = servers && servers.length > 0 ? servers : DEFAULT_SERVERS;
    if (incoming.some((s) => isNativeServer(s.id))) {
      return withNativePrimary(incoming);
    }
    return withNativePrimary([
      {
        id: 'native',
        name: 'Netwatch Direct HLS',
        quality: 'Adaptive HLS • Ad-Free',
        speed: 'Direct',
        isRecommended: true,
      },
      ...incoming,
    ]);
  }, [servers]);

  const [activeServerId, setActiveServerId] = useState<string>(() => {
    const recommended = baseServers.find((s) => s.isRecommended);
    return recommended?.id || baseServers.find((s) => isNativeServer(s.id))?.id || 'native';
  });
  const [nativeRetryToken, setNativeRetryToken] = useState(0);
  const [directMaxHeight, setDirectMaxHeight] = useState<number | null>(null);
  const prefsHydratedKeyRef = useRef<string | null>(null);

  const [serverBarOpen, setServerBarOpen] = useState(false);
  const [loadedEmbedUrl, setLoadedEmbedUrl] = useState<string | null>(null);
  const [slowEmbedUrl, setSlowEmbedUrl] = useState<string | null>(null);

  const [resumeState, setResumeState] = useState<{ key: string; time: number } | null>(null);
  const [nativeState, setNativeState] = useState<{
    key: string;
    streamUrl: string | null;
    subtitles: PlayerSubtitleTrack[];
    error: string | null;
  } | null>(null);
  const [autoFallbackNotice, setAutoFallbackNotice] = useState<{
    key: string;
    serverName: string;
  } | null>(null);

  const isNative = isNativeServer(activeServerId);
  const isTv = mediaType === 'tv';
  const mediaId = typeof id === 'number' ? id : parseInt(String(id), 10);
  const subtitleLabel = isTv ? `S${season}:E${episode}` : undefined;
  const episodeKey = `${mediaType}:${mediaId}:${isTv ? `${season}:${episode}` : 'movie'}`;
  const nativeKey = `${mediaType}:${id}:${isTv ? `${season}:${episode}` : 'movie'}`;

  const streamPrefsKey = useMemo(() => {
    if (Number.isNaN(mediaId)) return '';
    return buildStreamPrefsKey(mediaType, mediaId, season, episode);
  }, [mediaType, mediaId, season, episode]);

  const [playbackPrefs, setPlaybackPrefs] = useState<StreamPlaybackPrefs>(() =>
    streamPrefsKey ? getStreamPrefs(streamPrefsKey) : {}
  );

  const lastHistorySaveRef = useRef(0);
  const playbackPosRef = useRef({ currentTime: 0, duration: 0 });

  const effectiveServers = useMemo(() => {
    const resolved = resolvedServersMap[episodeKey];
    if (!resolved || resolved.length === 0) return baseServers;
    if (resolved.some((s) => isNativeServer(s.id))) return withNativePrimary(resolved);
    const nativeOption = baseServers.find((s) => isNativeServer(s.id));
    return withNativePrimary(nativeOption ? [nativeOption, ...resolved] : resolved);
  }, [resolvedServersMap, episodeKey, baseServers]);

  const fallbackRelayServer =
    effectiveServers.find((s) => !isNativeServer(s.id)) ||
    effectiveServers.find((s) => s.id === 'vidrift');
  const fallbackRelayServerId = fallbackRelayServer?.id || 'vidrift';

  const activeServer = effectiveServers.find((s) => s.id === activeServerId);

  useEffect(() => {
    if (!streamPrefsKey) return;
    if (prefsHydratedKeyRef.current === streamPrefsKey) return;
    prefsHydratedKeyRef.current = streamPrefsKey;
    const prefs = getStreamPrefs(streamPrefsKey);
    setPlaybackPrefs(prefs);
    if (prefs.serverId && effectiveServers.some((s) => s.id === prefs.serverId)) {
      setActiveServerId(prefs.serverId);
    }
  }, [streamPrefsKey, effectiveServers]);

  const handlePlaybackPrefsChange = useCallback(
    (patch: Partial<StreamPlaybackPrefs>) => {
      if (!streamPrefsKey) return;
      const next = setStreamPrefs(streamPrefsKey, patch);
      setPlaybackPrefs(next);
    },
    [streamPrefsKey]
  );

  const handleSelectServer = useCallback(
    (nextId: string) => {
      setAutoFallbackNotice(null);
      setActiveServerId(nextId);
      if (streamPrefsKey) {
        const next = setStreamPrefs(streamPrefsKey, { serverId: nextId });
        setPlaybackPrefs(next);
      }
    },
    [streamPrefsKey]
  );

  const embedUrl = useMemo(() => {
    const canTrustServerEmbedUrl =
      !isTv ||
      Boolean(resolvedServersMap[episodeKey]) ||
      (season === initialTarget.season && episode === initialTarget.episode);

    if (canTrustServerEmbedUrl && activeServer?.embedUrl) {
      return activeServer.embedUrl;
    }

    return buildServerStreamUrl({
      serverId: activeServerId,
      type: mediaType,
      id,
      season,
      episode,
      brand: 'Netwatch',
      brandColor: '#b0c6ff',
      font: 'Inter',
    });
  }, [
    isTv,
    resolvedServersMap,
    episodeKey,
    season,
    episode,
    initialTarget.season,
    initialTarget.episode,
    activeServer,
    activeServerId,
    mediaType,
    id,
  ]);

  const resumeTime = resumeState?.key === episodeKey ? resumeState.time : 0;
  const isResolvingNative =
    isNative &&
    (nativeState?.key !== nativeKey || (!nativeState.streamUrl && !nativeState.error));
  const nativeStreamUrl = nativeState?.key === nativeKey ? nativeState.streamUrl : null;
  const nativeSubtitles = nativeState?.key === nativeKey ? nativeState.subtitles : [];
  const nativeError = nativeState?.key === nativeKey ? nativeState.error : null;

  const isLoading = !isNative && loadedEmbedUrl !== embedUrl;
  const isEmbedSlow = isLoading && slowEmbedUrl === embedUrl;

  const saveProgress = useCallback(
    (
      event: 'timeupdate' | 'pause' | 'ended',
      currentTime: number,
      duration: number,
      force = false
    ) => {
      if (!mediaId || Number.isNaN(mediaId) || !duration || duration <= 0) return;

      const now = Date.now();
      if (!force && event === 'timeupdate' && now - lastHistorySaveRef.current < 12_000) {
        return;
      }
      lastHistorySaveRef.current = now;

      fetch(`/api/history/${mediaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getClientDeviceId(),
        },
        body: JSON.stringify({
          event,
          currentTime,
          duration,
          progress: Math.min(100, Math.max(0, (currentTime / duration) * 100)),
          mediaType,
          season: isTv ? season : null,
          episode: isTv ? episode : null,
        }),
        keepalive: force || event !== 'timeupdate',
      }).catch(() => {});
    },
    [mediaId, mediaType, isTv, season, episode]
  );

  // Dynamically resolve per-episode embed URLs when switching TV season/episode
  useEffect(() => {
    if (!isTv || !mediaId || Number.isNaN(mediaId)) return;
    if (season === initialTarget.season && episode === initialTarget.episode) return;

    const controller = new AbortController();
    fetch(
      `/api/streaming/resolve?type=tv&tmdbId=${mediaId}&season=${season}&episode=${episode}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data?.availableServers)) {
          setResolvedServersMap((prev) => ({
            ...prev,
            [episodeKey]: json.data.availableServers,
          }));
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('[EmbeddedPlayer] Streaming resolve error:', err);
        }
      });

    return () => controller.abort();
  }, [isTv, mediaId, season, episode, episodeKey, initialTarget.season, initialTarget.episode]);

  // Load resume timestamp for current item/episode via BFF
  useEffect(() => {
    if (!mediaId || Number.isNaN(mediaId)) return;

    const controller = new AbortController();
    const qs = new URLSearchParams({ mediaType });
    if (isTv) {
      qs.set('season', String(season));
      qs.set('episode', String(episode));
    }

    fetch(`/api/history/${mediaId}?${qs.toString()}`, {
      headers: { 'x-device-id': getClientDeviceId() },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        const status = json?.data;
        const p = status?.item_present ? status.data?.progress : null;
        if (!p) return;
        if (isTv && (p.season !== season || p.episode !== episode)) return;
        if (typeof p.currentTime === 'number' && p.currentTime > 5) {
          setResumeState({ key: episodeKey, time: p.currentTime });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [mediaId, mediaType, isTv, season, episode, episodeKey]);

  // Resolve direct HLS (ad-free). On deployed hosts, browser scrape first; local uses API first.
  useEffect(() => {
    if (!isNative) return;

    const controller = new AbortController();
    const query = isTv ? `?season=${season}&episode=${episode}` : '';
    const proxy = shouldProxyHls(
      typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    );

    const applySuccess = (payload: {
      streamUrl: string;
      subtitles?: PlayerSubtitleTrack[];
      maxHeight?: number | null;
    }) => {
      setAutoFallbackNotice(null);
      setDirectMaxHeight(payload.maxHeight ?? null);
      const directSubs = Array.isArray(payload.subtitles) ? payload.subtitles : [];
      setNativeState((prev) => ({
        key: nativeKey,
        streamUrl: payload.streamUrl,
        subtitles:
          prev && prev.key === nativeKey && prev.subtitles.length > 0
            ? mergeSubtitleTracks(directSubs, prev.subtitles)
            : directSubs,
        error: null,
      }));
    };

    const applyError = (error: string) => {
      setDirectMaxHeight(null);
      setNativeState({
        key: nativeKey,
        streamUrl: null,
        subtitles: [],
        error,
      });
    };

    const resolveFromClient = async () => {
      const clientResolved = await resolveDirectStreamFromEmbed({
        type: mediaType,
        id,
        season,
        episode,
        proxy,
        signal: controller.signal,
      });
      applySuccess({
        streamUrl: clientResolved.streamUrl,
        subtitles: clientResolved.subtitles,
        maxHeight: clientResolved.maxHeight,
      });
    };

    const resolveFromApi = async () => {
      const res = await fetch(`/api/stream/${mediaType}/${id}${query}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (!data?.success || !data.streamUrl) {
        throw new Error(data?.error || 'Failed to extract direct stream');
      }
      applySuccess({
        streamUrl: data.streamUrl,
        subtitles: data.subtitles,
        maxHeight: data.maxHeight ?? null,
      });
    };

    const streamPromise = (async () => {
      try {
        if (proxy) {
          await resolveFromClient();
        } else {
          await resolveFromApi();
        }
      } catch (primaryErr) {
        if (controller.signal.aborted) return;
        try {
          if (proxy) {
            await resolveFromApi();
          } else {
            await resolveFromClient();
          }
        } catch (fallbackErr) {
          if (controller.signal.aborted) return;
          const message =
            fallbackErr instanceof Error
              ? fallbackErr.message
              : primaryErr instanceof Error
                ? primaryErr.message
                : 'Failed to extract direct stream';
          applyError(message);
        }
      }
    })();

    if (mediaId && !Number.isNaN(mediaId)) {
      const subParams = new URLSearchParams({
        tmdbId: String(mediaId),
        type: mediaType,
        language: 'all',
      });
      if (isTv) {
        subParams.set('season', String(season));
        subParams.set('episode', String(episode));
      }

      fetch(`/api/subtitles?${subParams.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((subJson) => {
          if (!subJson?.success || !Array.isArray(subJson.subtitles)) return;
          const extraSubs = subJson.subtitles as PlayerSubtitleTrack[];
          if (extraSubs.length === 0) return;

          setNativeState((prev) => {
            if (!prev || prev.key !== nativeKey) {
              return {
                key: nativeKey,
                streamUrl: null,
                subtitles: extraSubs,
                error: null,
              };
            }
            return {
              ...prev,
              subtitles: mergeSubtitleTracks(prev.subtitles, extraSubs),
            };
          });
        })
        .catch(() => {});
    }

    void streamPromise;

    return () => controller.abort();
  }, [isNative, mediaType, id, mediaId, season, episode, isTv, nativeKey, nativeRetryToken]);

  // Iframe postMessage exit handler (origin-verified)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://embed.vidrift.net') return;
      if (
        event.data === 'vidrift:exit' ||
        (typeof event.data === 'object' && event.data?.type === 'vidrift:exit')
      ) {
        onExit?.();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onExit]);

  // Track slow/blocked external embed iframes after 12s
  useEffect(() => {
    if (isNative) return;
    const timer = setTimeout(() => {
      setSlowEmbedUrl(embedUrl);
    }, 12_000);
    return () => clearTimeout(timer);
  }, [isNative, embedUrl]);

  // Persist watch progress when tab goes hidden or player unmounts
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const { currentTime, duration } = playbackPosRef.current;
        if (currentTime > 5 && duration > 0) {
          saveProgress('pause', currentTime, duration, true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      const { currentTime, duration } = playbackPosRef.current;
      if (currentTime > 5 && duration > 0) {
        saveProgress('pause', currentTime, duration, true);
      }
    };
  }, [saveProgress]);

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      playbackPosRef.current = { currentTime, duration };
      saveProgress('timeupdate', currentTime, duration, false);
    },
    [saveProgress]
  );

  const handlePlayerEnded = useCallback(() => {
    const { duration } = playbackPosRef.current;
    if (duration > 0) {
      saveProgress('ended', duration, duration, true);
    }
    if (onEnded) {
      onEnded();
    } else {
      onExit?.();
    }
  }, [saveProgress, onEnded, onExit]);

  const handleSearchSubtitles = useCallback(
    async (params: SubtitleSearchParams) => {
      const q = new URLSearchParams({
        language: params.language || 'all',
        query: params.query || '',
      });
      if (params.tmdbId) q.set('tmdbId', String(params.tmdbId));
      if (params.mediaType) q.set('type', params.mediaType);
      if (params.mediaType === 'tv') {
        q.set('season', String(params.season ?? season));
        q.set('episode', String(params.episode ?? episode));
      }
      const res = await fetch(`/api/subtitles?${q.toString()}`);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.subtitles)) {
        throw new Error(data.error || 'Subtitle search failed');
      }
      return data.subtitles as PlayerSubtitleTrack[];
    },
    [season, episode]
  );

  const directQualityLabel =
    directMaxHeight && directMaxHeight > 0
      ? `Adaptive • Up to ${directMaxHeight}p`
      : 'Adaptive HLS • Ad-Free';

  const serverOptions: StreamingServerOption[] = effectiveServers.map((s) => ({
    id: s.id,
    name: s.name,
    quality: isNativeServer(s.id) ? directQualityLabel : s.quality,
    speed: s.speed,
    isRecommended: s.isRecommended,
  }));

  const playerBadges = useMemo(() => {
    if (qualityBadge) return [qualityBadge];
    if (directMaxHeight && directMaxHeight > 0) return [`Up to ${directMaxHeight}p`];
    return undefined;
  }, [qualityBadge, directMaxHeight]);

  const showFallbackNotice = !isNative && autoFallbackNotice?.key === nativeKey;

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Top Watch Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--rd-color-surface-container-high)]/70 hover:bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Details</span>
          </button>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {showFallbackNotice && (
            <div className="inline-flex items-center gap-2 min-h-[36px] px-3 py-1 rounded-lg border border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium">
              <span>Direct HLS unavailable — switched to {autoFallbackNotice.serverName}</span>
              <button
                type="button"
                onClick={() => {
                  setAutoFallbackNotice(null);
                  setActiveServerId('native');
                }}
                className="font-bold underline hover:opacity-80 cursor-pointer"
              >
                Retry Direct
              </button>
            </div>
          )}

          <span
            title={
              isNative
                ? 'Primary: Direct HLS — ad-free Netwatch player'
                : 'Secondary embed — popups allowed; top-level ad redirects blocked'
            }
            className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              isNative
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-[var(--rd-color-primary)]/10 border-[var(--rd-color-primary)]/30 text-[var(--rd-color-primary)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{isNative ? 'Ad-Free Direct' : 'Embed Relay'}</span>
          </span>

          <button
            type="button"
            onClick={() => setServerBarOpen((o) => !o)}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--rd-color-surface-container-high)]/70 hover:bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            aria-expanded={serverBarOpen}
          >
            <span>Source: {activeServer?.name || activeServerId}</span>
            {serverBarOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {serverBarOpen && (
        <div className="px-1 pb-1">
          <ServerSelector
            servers={serverOptions}
            activeServerId={activeServerId}
            onSelectServer={handleSelectServer}
          />
        </div>
      )}

      <div className="relative w-full aspect-video bg-black overflow-hidden rounded-lg sm:rounded-xl border border-[var(--rd-color-outline-variant)]/30">
        {isNative ? (
          <>
            {isResolvingNative && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-white bg-black">
                <Loader2 className="w-10 h-10 text-[var(--rd-color-primary)] animate-spin" />
                <p className="text-xs text-white/75">Preparing direct stream…</p>
              </div>
            )}
            {nativeError && !isResolvingNative && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-white p-6 text-center bg-black/95">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-sm font-semibold max-w-md">{nativeError}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNativeState(null);
                      setNativeRetryToken((n) => n + 1);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:opacity-90 cursor-pointer"
                  >
                    Retry Direct
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveServerId(fallbackRelayServerId)}
                    className="px-4 py-2.5 rounded-xl bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] font-bold text-xs hover:opacity-90 cursor-pointer"
                  >
                    Try other source
                  </button>
                </div>
              </div>
            )}
            {nativeStreamUrl && !nativeError && (
              <NetwatchPlayer
                key={`${nativeStreamUrl}-${season}-${episode}`}
                variant="inline"
                src={nativeStreamUrl}
                initialSubtitles={nativeSubtitles}
                title={title || 'Netwatch'}
                subtitle={subtitleLabel}
                overview={overview}
                poster={poster}
                mediaType={mediaType}
                tmdbId={mediaId}
                season={season}
                episode={episode}
                seasons={seasons}
                episodes={episodes}
                episodesLoading={episodesLoading}
                badges={playerBadges}
                prefsKey={streamPrefsKey || undefined}
                initialPlaybackPrefs={playbackPrefs}
                onPlaybackPrefsChange={handlePlaybackPrefsChange}
                onSelectEpisode={onSelectEpisode}
                onSeasonChange={onSeasonChange}
                autoPlay
                startTime={resumeTime}
                onTimeUpdate={handleTimeUpdate}
                onBack={onExit}
                onEnded={handlePlayerEnded}
                onSearchSubtitles={handleSearchSubtitles}
                className="absolute inset-0 w-full h-full aspect-auto rounded-none border-0 shadow-none"
              />
            )}
          </>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/90 text-white p-4 text-center">
                <Loader2 className="w-8 h-8 text-[var(--rd-color-primary)] animate-spin" />
                {isEmbedSlow && (
                  <div className="space-y-3 max-w-sm">
                    <p className="text-xs text-white/80">
                      This embed relay is taking longer than expected or was blocked by sandbox containment.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveServerId('native')}
                        className="px-3.5 py-2 rounded-lg bg-emerald-500 text-black text-xs font-bold cursor-pointer hover:opacity-90"
                      >
                        Use Ad-Free Direct
                      </button>
                      <button
                        type="button"
                        onClick={() => setServerBarOpen(true)}
                        className="px-3.5 py-2 rounded-lg bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] text-xs font-semibold cursor-pointer hover:opacity-90"
                      >
                        Switch Server
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Popups allowed for embed gates; top-navigation omitted so ads cannot leave Netwatch. */}
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={title || 'Netwatch Stream'}
              onLoad={() => setLoadedEmbedUrl(embedUrl)}
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 w-full h-full border-0"
            />
          </>
        )}
      </div>
    </div>
  );
};
