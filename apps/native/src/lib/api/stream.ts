import type { StreamingServerInfo } from '@netwatch/core';
import { toAbsoluteNetwatchApiPath } from '../api-url';
import { resolveNetwatchBaseUrl } from '../config';

export interface NativeSubtitleTrack {
  id: string;
  label: string;
  lang: string;
  url: string;
  source?: string;
}

export type PlaybackSource =
  | {
      mode: 'direct';
      url: string;
      maxHeight?: number | null;
      subtitles: NativeSubtitleTrack[];
      servers: StreamingServerInfo[];
    }
  | {
      mode: 'embed';
      url: string;
      serverId: string;
      serverName: string;
      servers: StreamingServerInfo[];
    };

type StreamResolveResponse = {
  success: boolean;
  streamUrl?: string;
  maxHeight?: number | null;
  subtitles?: NativeSubtitleTrack[];
  error?: string;
};

type EmbedResolveResponse = {
  success: boolean;
  data?: {
    selectedServer?: StreamingServerInfo;
    availableServers?: StreamingServerInfo[];
  };
  error?: string;
};

function buildVidriftFallbackUrl(
  type: 'movie' | 'tv',
  id: number,
  season: number,
  episode: number
): string {
  const basePath =
    type === 'tv'
      ? `https://embed.vidrift.net/embed/tv/${id}/${season}/${episode}`
      : `https://embed.vidrift.net/embed/movie/${id}`;
  const params = new URLSearchParams({
    brand: 'Netwatch',
    brandColor: '#b0c6ff',
    font: 'Inter',
    showTitle: '1',
    mobileSheets: 'true',
  });
  return `${basePath}?${params.toString()}`;
}

export async function fetchAvailableEmbedServers(
  type: 'movie' | 'tv',
  id: number,
  season: number,
  episode: number
): Promise<{ selected: StreamingServerInfo | null; servers: StreamingServerInfo[] }> {
  try {
    const base = await resolveNetwatchBaseUrl();
    const params = new URLSearchParams({
      type,
      tmdbId: String(id),
      season: String(season),
      episode: String(episode),
    });
    const res = await fetch(`${base}/api/streaming/resolve?${params.toString()}`);
    if (!res.ok) return { selected: null, servers: [] };
    const json = (await res.json()) as EmbedResolveResponse;
    const servers = Array.isArray(json.data?.availableServers)
      ? json.data!.availableServers!
      : [];
    const selected = json.data?.selectedServer ?? servers[0] ?? null;
    return { selected, servers };
  } catch {
    return { selected: null, servers: [] };
  }
}

export async function fetchDirectStream(
  type: 'movie' | 'tv',
  id: number,
  season: number,
  episode: number
): Promise<{
  url: string;
  maxHeight: number | null;
  subtitles: NativeSubtitleTrack[];
} | null> {
  const base = await resolveNetwatchBaseUrl();
  const query = type === 'tv' ? `?season=${season}&episode=${episode}` : '';
  const res = await fetch(`${base}/api/stream/${type}/${id}${query}`);
  if (!res.ok) return null;
  const json = (await res.json()) as StreamResolveResponse;
  if (!json.success || !json.streamUrl) return null;
  const absoluteUrl = await toAbsoluteNetwatchApiPath(json.streamUrl);
  const subs = Array.isArray(json.subtitles) ? json.subtitles : [];
  return {
    url: absoluteUrl,
    maxHeight: json.maxHeight ?? null,
    subtitles: subs,
  };
}

export async function fetchPlaybackSource(
  type: 'movie' | 'tv',
  id: number,
  season = 1,
  episode = 1,
  preferredServerId = 'native'
): Promise<PlaybackSource> {
  const embedInfoPromise = fetchAvailableEmbedServers(type, id, season, episode);

  if (preferredServerId === 'native') {
    try {
      const direct = await fetchDirectStream(type, id, season, episode);
      if (direct) {
        const embedInfo = await embedInfoPromise;
        return {
          mode: 'direct',
          url: direct.url,
          maxHeight: direct.maxHeight,
          subtitles: direct.subtitles,
          servers: embedInfo.servers,
        };
      }
    } catch {
      /* fall through to embed relay */
    }
  }

  const embedInfo = await embedInfoPromise;
  const chosenServer =
    (preferredServerId !== 'native'
      ? embedInfo.servers.find((s) => s.id === preferredServerId)
      : null) ??
    embedInfo.selected ??
    embedInfo.servers[0] ??
    null;

  if (chosenServer?.embedUrl) {
    return {
      mode: 'embed',
      url: chosenServer.embedUrl,
      serverId: chosenServer.id,
      serverName: chosenServer.name,
      servers: embedInfo.servers,
    };
  }

  const fallbackUrl = buildVidriftFallbackUrl(type, id, season, episode);
  return {
    mode: 'embed',
    url: fallbackUrl,
    serverId: 'vidrift',
    serverName: 'VidRift Relay',
    servers: embedInfo.servers,
  };
}

/** @deprecated Prefer fetchPlaybackSource */
export async function fetchStreamUrl(
  type: 'movie' | 'tv',
  id: number,
  season = 1,
  episode = 1
): Promise<string> {
  const source = await fetchPlaybackSource(type, id, season, episode);
  return source.url;
}
