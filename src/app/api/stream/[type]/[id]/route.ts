import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

interface RawSubtitleTrack {
  label?: string;
  lang?: string;
  code?: string;
  url?: string;
}

interface EmbedMetaPayload {
  orionStreams?: Array<{ url?: string; type?: string; direct?: boolean }>;
  evionUrl?: string;
  vexonUrl?: string;
  bigbangUrl?: string;
  selfhostUrl?: string | null;
}

interface StreamCandidate {
  url: string;
  source: string;
}

const VIDRIFT_ORIGIN = 'https://embed.vidrift.net';

function normalizeHttpsUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const resolved = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, VIDRIFT_ORIGIN);

    if (resolved.protocol !== 'https:') return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function extractStreamCandidates(html: string): StreamCandidate[] {
  const candidates: StreamCandidate[] = [];
  const seen = new Set<string>();

  const pushCandidate = (rawUrl: string | null | undefined, source: string) => {
    const normalized = normalizeHttpsUrl(rawUrl);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push({ url: normalized, source });
  };

  // 1. Parse embedMeta JSON (Orion, Evion, Vexon, BigBang, Selfhost)
  const metaMatch = html.match(/var embedMeta = (\{[\s\S]*?\});/);
  if (metaMatch?.[1]) {
    try {
      const meta = JSON.parse(metaMatch[1]) as EmbedMetaPayload;
      if (Array.isArray(meta.orionStreams)) {
        for (const stream of meta.orionStreams) {
          pushCandidate(stream?.url, 'vidrift-orion-direct');
        }
      }
      // 3-4 fallback extraction order: Orion -> Evion -> Vexon -> BigBang -> Selfhost
      pushCandidate(meta.evionUrl, 'vidrift-evion-direct');
      pushCandidate(meta.vexonUrl, 'vidrift-vexon-direct');
      pushCandidate(meta.bigbangUrl, 'vidrift-bigbang-direct');
      pushCandidate(meta.selfhostUrl, 'vidrift-selfhost-direct');
    } catch (err) {
      console.warn('Failed to parse embedMeta JSON:', err);
    }
  }

  // 2. Fallback scan for inline Orion master playlists in case embedMeta format varies
  const orionMatches = html.match(/\/api\/orion\/[a-f0-9]+\/master\.m3u8/g);
  if (orionMatches) {
    for (const match of orionMatches) {
      pushCandidate(match, 'vidrift-orion-direct');
    }
  }

  return candidates;
}

function fetchRawHtml(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 8000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: string) => {
            data += chunk;
          });
          res.on('end', () => resolve({ status: res.statusCode || 200, data }));
        }
      )
      .on('timeout', () => {
        req.destroy(new Error('Upstream stream timeout'));
      })
      .on('error', (err) => reject(err));
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const noStore = { 'Cache-Control': 'no-store' };

  try {
    const { type, id } = await params;
    const numId = Number(id);
    if ((type !== 'movie' && type !== 'tv') || !Number.isInteger(numId) || numId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid media type or ID' },
        { status: 400, headers: noStore }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const seasonNum = Number(searchParams.get('season') || '1');
    const episodeNum = Number(searchParams.get('episode') || '1');
    if (
      type === 'tv' &&
      (!Number.isInteger(seasonNum) ||
        seasonNum < 1 ||
        !Number.isInteger(episodeNum) ||
        episodeNum < 1)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid season or episode number' },
        { status: 400, headers: noStore }
      );
    }

    const embedUrl =
      type === 'tv'
        ? `${VIDRIFT_ORIGIN}/embed/tv/${numId}/${seasonNum}/${episodeNum}`
        : `${VIDRIFT_ORIGIN}/embed/movie/${numId}`;

    const { status, data: html } = await fetchRawHtml(embedUrl);

    if (status !== 200) {
      return NextResponse.json(
        { success: false, error: `Upstream error: ${status}` },
        { status: 502, headers: noStore }
      );
    }

    // Extract Subtitle Tracks regardless of stream match so caller gets subtitle tracks cleanly
    let subtitles: Array<{ id: number; label: string; lang: string; url: string }> = [];
    const subsMatch = html.match(/var subtitleTracks = (\[[\s\S]*?\]);/);
    if (subsMatch && subsMatch[1]) {
      try {
        const rawSubs = JSON.parse(subsMatch[1]) as RawSubtitleTrack[];
        subtitles = rawSubs.reduce<
          Array<{ id: number; label: string; lang: string; url: string }>
        >((acc, s, idx) => {
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
      }
    }

    const candidates = extractStreamCandidates(html);
    if (candidates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No direct stream found in upstream manifest',
        },
        { status: 404, headers: noStore }
      );
    }

    return NextResponse.json(
      {
        success: true,
        streamUrl: candidates[0].url,
        alternateStreams: candidates.slice(1).map((c) => c.url),
        subtitles,
        source: candidates[0].source,
      },
      { headers: noStore }
    );
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : 'Stream resolution failed';
    const message =
      process.env.NODE_ENV === 'production' ? 'Stream resolution failed' : rawMessage;
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: noStore }
    );
  }
}
