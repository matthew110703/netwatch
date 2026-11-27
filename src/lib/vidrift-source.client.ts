'use client';

import { VIDRIFT_ORIGIN } from '@/lib/vidrift-stream';
import { toProxiedHlsUrl } from '@/lib/vidrift-stream';

export const VIDRIFT_SOURCE_PROVIDERS = ['vela', 'atlas', 'titan', 'lyra', 'orion'] as const;

export interface VidriftStreamSession {
  playbackToken: string;
  parentHost: string;
  sourcePath: string;
  type: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
}

export interface VidriftResolvedPlayback {
  streamUrl: string;
  source: string;
  provider: string;
  maxHeight: number | null;
  alternateStreams: string[];
}

interface VidriftSourceStream {
  url?: string;
  proxyUrl?: string;
  type?: string;
  provider?: string;
  direct?: boolean;
  maxHeight?: number;
}

interface VidriftSourceResponse {
  success?: boolean;
  provider?: string;
  maxRes?: number | null;
  quality?: string | null;
  streams?: VidriftSourceStream[];
}

function pickHlsUrl(stream: VidriftSourceStream): string | null {
  const candidate = stream.proxyUrl || stream.url;
  if (!candidate || typeof candidate !== 'string') return null;
  if (stream.type && stream.type !== 'hls' && !candidate.includes('.m3u8')) {
    return null;
  }
  try {
    const parsed = new URL(candidate, VIDRIFT_ORIGIN);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildSourcePath(session: VidriftStreamSession): string {
  if (session.type === 'tv') {
    const s = session.season ?? 1;
    const e = session.episode ?? 1;
    return `tv/${session.tmdbId}/${s}/${e}`;
  }
  return `movie/${session.tmdbId}`;
}

export async function resolveVidriftSourceInBrowser(
  session: VidriftStreamSession,
  proxyHls = true
): Promise<VidriftResolvedPlayback> {
  const sourcePath = session.sourcePath || buildSourcePath(session);
  const parent = session.parentHost || window.location.hostname;

  let lastError: Error | null = null;

  for (const provider of VIDRIFT_SOURCE_PROVIDERS) {
    const q = new URL(`${VIDRIFT_ORIGIN}/api/source/${sourcePath}`);
    q.searchParams.set('token', session.playbackToken);
    q.searchParams.set('provider', provider);
    q.searchParams.set('parent', parent);

    try {
      const res = await fetch(q.toString(), { credentials: 'omit', mode: 'cors' });
      if (!res.ok) {
        lastError = new Error(`VidRift source ${provider}: HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as VidriftSourceResponse;
      const streams = Array.isArray(json.streams) ? json.streams : [];
      const urls = streams.map(pickHlsUrl).filter((u): u is string => Boolean(u));
      if (urls.length === 0) {
        lastError = new Error(`VidRift source ${provider}: no HLS URL`);
        continue;
      }

      const mapUrl = (url: string) => (proxyHls ? toProxiedHlsUrl(url) : url);
      const resolvedProvider = json.provider || provider;
      const maxFromStream = streams.find((s) => typeof s.maxHeight === 'number')?.maxHeight;

      return {
        streamUrl: mapUrl(urls[0]),
        alternateStreams: urls.slice(1).map(mapUrl),
        source: `vidrift-${resolvedProvider}`,
        provider: resolvedProvider,
        maxHeight:
          typeof json.maxRes === 'number'
            ? json.maxRes
            : typeof maxFromStream === 'number'
              ? maxFromStream
              : null,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('All VidRift sources failed');
}