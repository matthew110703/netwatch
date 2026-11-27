import https from 'node:https';
import { VIDRIFT_ORIGIN } from '@/lib/vidrift-stream';

const IFRAME_NAV_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'iframe',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'cross-site',
  'Upgrade-Insecure-Requests': '1',
} as const;

export interface VidriftEmbedMeta {
  playbackToken: string;
  parentHost: string;
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

export function buildWatchReferer(origin: string, type: 'movie' | 'tv', id: number): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}/watch/${type}/${id}`;
}

export type EmbedFetchResult = { status: number; data: string; via: string };

function fetchRawHtmlHttps(
  url: string,
  headers: Record<string, string>
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers,
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode || 200, data }));
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('VidRift embed timeout'));
    });
    req.on('error', (err) => reject(err));
  });
}

async function fetchRawHtmlFollow(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 12000
): Promise<{ status: number; data: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
    const data = await res.text();
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaTranslateRelay(embedUrl: string): Promise<{ status: number; data: string }> {
  const relayUrl =
    'https://translate.google.com/translate?sl=auto&tl=en&u=' + encodeURIComponent(embedUrl);
  return fetchRawHtmlFollow(relayUrl, { ...IFRAME_NAV_HEADERS }, 15000);
}

function embedHtmlLooksValid(html: string): boolean {
  return /embedMeta|playbackToken|\/api\/orion\//.test(html);
}

/**
 * VidRift blocks many datacenter IPs (e.g. Vercel). Residential/dev often works on https.get;
 * fetch() from Node may still get 403. Tries several strategies before giving up.
 */
export async function fetchVidriftEmbedHtml(embedUrl: string, referer: string): Promise<EmbedFetchResult> {
  const iframeHeaders = { ...IFRAME_NAV_HEADERS, Referer: referer };

  try {
    const legacy = await fetchRawHtmlHttps(embedUrl, iframeHeaders);
    if (legacy.status === 200 && embedHtmlLooksValid(legacy.data)) {
      return { ...legacy, via: 'https.get' };
    }
    if (legacy.status === 200 && legacy.data.length > 1000) {
      return { ...legacy, via: 'https.get' };
    }
    if (legacy.status !== 200) {
      const relayed = await fetchViaTranslateRelay(embedUrl);
      if (relayed.status === 200 && embedHtmlLooksValid(relayed.data)) {
        return { ...relayed, via: 'translate-relay' };
      }
      return { ...legacy, via: 'https.get' };
    }
  } catch {
    // continue to fetch / relay
  }

  try {
    const viaFetch = await fetchRawHtmlFollow(embedUrl, iframeHeaders);
    if (viaFetch.status === 200 && embedHtmlLooksValid(viaFetch.data)) {
      return { ...viaFetch, via: 'fetch' };
    }
    if (viaFetch.status !== 200) {
      const relayed = await fetchViaTranslateRelay(embedUrl);
      if (relayed.status === 200 && embedHtmlLooksValid(relayed.data)) {
        return { ...relayed, via: 'translate-relay' };
      }
    }
  } catch {
    // fall through
  }

  const relayed = await fetchViaTranslateRelay(embedUrl);
  return { ...relayed, via: 'translate-relay' };
}

export function parseEmbedMetaFromHtml(
  html: string,
  fallback: { type: 'movie' | 'tv'; tmdbId: number; season?: number; episode?: number }
): VidriftEmbedMeta | null {
  const match = html.match(/var embedMeta = (\{[\s\S]*?\});/);
  if (!match?.[1]) return null;
  try {
    const meta = JSON.parse(match[1]) as {
      playbackToken?: string;
      parent?: string;
      tmdbId?: string | number;
      type?: string;
      season?: string | number;
      episode?: string | number;
    };
    const token = typeof meta.playbackToken === 'string' ? meta.playbackToken.trim() : '';
    if (!token) return null;
    const parentHost =
      typeof meta.parent === 'string' && meta.parent.trim() ? meta.parent.trim() : '';
    const tmdbId = Number(meta.tmdbId ?? fallback.tmdbId);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) return null;
    const type: 'movie' | 'tv' = meta.type === 'tv' ? 'tv' : 'movie';
    return {
      playbackToken: token,
      parentHost,
      tmdbId,
      type,
      season:
        type === 'tv'
          ? Math.max(1, Number(meta.season ?? fallback.season ?? 1))
          : undefined,
      episode:
        type === 'tv'
          ? Math.max(1, Number(meta.episode ?? fallback.episode ?? 1))
          : undefined,
    };
  } catch {
    return null;
  }
}

export function buildVidriftEmbedUrl(
  type: 'movie' | 'tv',
  tmdbId: number,
  season = 1,
  episode = 1
): string {
  return type === 'tv'
    ? `${VIDRIFT_ORIGIN}/embed/tv/${tmdbId}/${season}/${episode}`
    : `${VIDRIFT_ORIGIN}/embed/movie/${tmdbId}`;
}