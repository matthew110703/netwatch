export const VIDRIFT_ORIGIN = 'https://embed.vidrift.net';

interface OrionRung {
  width?: number;
  height?: number;
}

interface EmbedMetaPayload {
  orionStreams?: Array<{
    url?: string;
    type?: string;
    direct?: boolean;
    rungs?: OrionRung[];
  }>;
  evionUrl?: string;
  vexonUrl?: string;
  bigbangUrl?: string;
  selfhostUrl?: string | null;
}

export interface StreamCandidate {
  url: string;
  source: string;
  maxHeight?: number;
}

export interface ResolvedDirectStream {
  streamUrl: string;
  alternateStreams: string[];
  source: string;
  maxHeight: number | null;
  subtitles: Array<{ id: number; label: string; lang: string; url: string }>;
}

function maxRungHeight(rungs?: OrionRung[]): number {
  if (!Array.isArray(rungs) || rungs.length === 0) return 0;
  return Math.max(...rungs.map((r) => (typeof r.height === 'number' ? r.height : 0)));
}

function sortCandidatesByQuality(candidates: StreamCandidate[]): StreamCandidate[] {
  return [...candidates].sort((a, b) => (b.maxHeight ?? 0) - (a.maxHeight ?? 0));
}

const ALLOWED_HLS_HOST_SUFFIXES = [
  'embed.vidrift.net',
  'cdn.vidrift.net',
  'vidrift.net',
  'milkyway.cymru',
  'hscow.com',
  'wetki450sit.com',
];

export function normalizeHttpsUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const resolved =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, VIDRIFT_ORIGIN);

    if (resolved.protocol !== 'https:') return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

export function isAllowedHlsUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    const allowed = ALLOWED_HLS_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
    return allowed ? parsed : null;
  } catch {
    return null;
  }
}

export function extractStreamCandidates(html: string): StreamCandidate[] {
  const candidates: StreamCandidate[] = [];
  const seen = new Set<string>();

  const pushCandidate = (
    rawUrl: string | null | undefined,
    source: string,
    maxHeight = 0
  ) => {
    const normalized = normalizeHttpsUrl(rawUrl);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push({ url: normalized, source, maxHeight: maxHeight > 0 ? maxHeight : undefined });
  };

  const metaMatch = html.match(/var embedMeta = (\{[\s\S]*?\});/);
  if (metaMatch?.[1]) {
    try {
      const meta = JSON.parse(metaMatch[1]) as EmbedMetaPayload;
      if (Array.isArray(meta.orionStreams)) {
        for (const stream of meta.orionStreams) {
          pushCandidate(stream?.url, 'vidrift-orion-direct', maxRungHeight(stream?.rungs));
        }
      }
      pushCandidate(meta.evionUrl, 'vidrift-evion-direct');
      pushCandidate(meta.vexonUrl, 'vidrift-vexon-direct');
      pushCandidate(meta.bigbangUrl, 'vidrift-bigbang-direct');
      pushCandidate(meta.selfhostUrl, 'vidrift-selfhost-direct');
    } catch (err) {
      console.warn('Failed to parse embedMeta JSON:', err);
    }
  }

  const orionMatches = html.match(/\/api\/orion\/[a-f0-9]+\/master\.m3u8/g);
  if (orionMatches) {
    for (const match of orionMatches) {
      pushCandidate(match, 'vidrift-orion-direct');
    }
  }

  return sortCandidatesByQuality(candidates);
}

export function extractSubtitleTracks(html: string): ResolvedDirectStream['subtitles'] {
  const subsMatch = html.match(/var subtitleTracks = (\[[\s\S]*?\]);/);
  if (!subsMatch?.[1]) return [];

  try {
    const rawSubs = JSON.parse(subsMatch[1]) as Array<{
      label?: string;
      lang?: string;
      code?: string;
      url?: string;
    }>;

    return rawSubs.reduce<ResolvedDirectStream['subtitles']>((acc, s, idx) => {
      if (!s.url) return acc;
      const absoluteUrl = normalizeHttpsUrl(s.url);
      if (!absoluteUrl) return acc;
      acc.push({
        id: idx,
        label: s.label || s.lang || `Track ${idx + 1}`,
        lang: s.lang || s.code || 'en',
        url: `/api/subtitles?url=${encodeURIComponent(absoluteUrl)}`,
      });
      return acc;
    }, []);
  } catch (err) {
    console.warn('Failed to parse subtitle JSON:', err);
    return [];
  }
}

/** Same-origin proxy so hls.js does not send page Origin to VidRift (blocked on vercel.app). */
export function toProxiedHlsUrl(upstreamUrl: string): string {
  return `/api/hls?url=${encodeURIComponent(upstreamUrl)}`;
}

export function shouldProxyHls(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host !== 'localhost' && host !== '127.0.0.1';
}

export function buildEmbedPageUrl(
  type: 'movie' | 'tv',
  id: number | string,
  season = 1,
  episode = 1
): string {
  return type === 'tv'
    ? `${VIDRIFT_ORIGIN}/embed/tv/${id}/${season}/${episode}`
    : `${VIDRIFT_ORIGIN}/embed/movie/${id}`;
}

export async function resolveDirectStreamFromEmbed(options: {
  type: 'movie' | 'tv';
  id: number | string;
  season?: number;
  episode?: number;
  proxy?: boolean;
  signal?: AbortSignal;
}): Promise<ResolvedDirectStream> {
  const embedUrl = buildEmbedPageUrl(
    options.type,
    options.id,
    options.season ?? 1,
    options.episode ?? 1
  );

  const res = await fetch(embedUrl, {
    signal: options.signal,
    headers: { Accept: 'text/html' },
  });

  if (!res.ok) {
    throw new Error(`Upstream error: ${res.status}`);
  }

  const html = await res.text();
  const candidates = extractStreamCandidates(html);
  if (candidates.length === 0) {
    throw new Error('No direct stream found in upstream manifest');
  }

  const mapUrl = (url: string) => (options.proxy ? toProxiedHlsUrl(url) : url);
  const best = candidates[0];
  const maxHeight = best.maxHeight ?? null;

  return {
    streamUrl: mapUrl(best.url),
    alternateStreams: candidates.slice(1).map((c) => mapUrl(c.url)),
    source: best.source,
    maxHeight,
    subtitles: extractSubtitleTracks(html),
  };
}
