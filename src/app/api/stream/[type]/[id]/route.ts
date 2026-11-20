import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import { streamingApi } from '@/lib/api';
import {
  VIDRIFT_ORIGIN,
  extractStreamCandidates,
  extractSubtitleTracks,
  shouldProxyHls,
  toProxiedHlsUrl,
  type ResolvedDirectStream,
} from '@/lib/vidrift-stream';

function fetchRawHtml(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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

function mapResolvedForClient(
  resolved: ResolvedDirectStream,
  proxy: boolean
): Record<string, unknown> {
  const mapUrl = (url: string) => (proxy ? toProxiedHlsUrl(url) : url);
  const mapSub = (sub: ResolvedDirectStream['subtitles'][number]) => {
    const isAbsolute = sub.url.startsWith('https://');
    return {
      ...sub,
      url: isAbsolute ? `/api/subtitles?url=${encodeURIComponent(sub.url)}` : sub.url,
    };
  };

  return {
    success: true,
    streamUrl: mapUrl(resolved.streamUrl),
    alternateStreams: resolved.alternateStreams.map(mapUrl),
    subtitles: resolved.subtitles.map(mapSub),
    source: resolved.source,
    maxHeight: resolved.maxHeight,
    proxied: proxy,
  };
}

async function resolveViaLocalScrape(
  type: 'movie' | 'tv',
  numId: number,
  seasonNum: number,
  episodeNum: number
): Promise<{ ok: true; resolved: ResolvedDirectStream } | { ok: false; status: number }> {
  const embedUrl =
    type === 'tv'
      ? `${VIDRIFT_ORIGIN}/embed/tv/${numId}/${seasonNum}/${episodeNum}`
      : `${VIDRIFT_ORIGIN}/embed/movie/${numId}`;

  const { status, data: html } = await fetchRawHtml(embedUrl);
  if (status !== 200) {
    return { ok: false, status };
  }

  const candidates = extractStreamCandidates(html);
  if (candidates.length === 0) {
    return { ok: false, status: 404 };
  }

  const best = candidates[0];
  return {
    ok: true,
    resolved: {
      streamUrl: best.url,
      alternateStreams: candidates.slice(1).map((c) => c.url),
      source: best.source,
      maxHeight: best.maxHeight ?? null,
      subtitles: extractSubtitleTracks(html),
    },
  };
}

async function resolveViaBraindance(
  type: 'movie' | 'tv',
  numId: number,
  seasonNum: number,
  episodeNum: number
): Promise<ResolvedDirectStream> {
  return streamingApi.resolveDirect({
    type,
    tmdbId: numId,
    season: seasonNum,
    episode: episodeNum,
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

    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const hostname = hostHeader.split(':')[0] || '';
    const proxy = shouldProxyHls(hostname) || Boolean(process.env.VERCEL);
    const preferBraindance = Boolean(process.env.VERCEL) || proxy;

    let resolved: ResolvedDirectStream | null = null;
    let via: 'local' | 'braindance' | null = null;
    let localStatus: number | null = null;

    if (!preferBraindance) {
      const local = await resolveViaLocalScrape(type, numId, seasonNum, episodeNum);
      if (local.ok) {
        resolved = local.resolved;
        via = 'local';
      } else {
        localStatus = local.status;
      }
    }

    if (!resolved) {
      try {
        resolved = await resolveViaBraindance(type, numId, seasonNum, episodeNum);
        via = 'braindance';
      } catch (braindanceErr) {
        // #region agent log
        fetch('http://127.0.0.1:7382/ingest/9e6e0e4d-e4aa-4ee8-a0d7-f373f87445e6', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7b6556' },
          body: JSON.stringify({
            sessionId: '7b6556',
            runId: 'pre-fix',
            hypothesisId: 'C',
            location: 'api/stream/route.ts:braindance-fail',
            message: 'Braindance direct resolve failed',
            data: {
              preferBraindance,
              localStatus,
              error: braindanceErr instanceof Error ? braindanceErr.message : String(braindanceErr),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        if (!preferBraindance) {
          const local = await resolveViaLocalScrape(type, numId, seasonNum, episodeNum);
          if (local.ok) {
            resolved = local.resolved;
            via = 'local';
          } else {
            localStatus = local.status;
          }
        }

        if (!resolved) {
          const status = localStatus && localStatus !== 200 ? localStatus : 502;
          return NextResponse.json(
            {
              success: false,
              error:
                localStatus && localStatus !== 200
                  ? `Upstream error: ${localStatus}`
                  : braindanceErr instanceof Error
                    ? braindanceErr.message
                    : 'Stream resolution failed',
            },
            { status: status === 404 ? 404 : 502, headers: noStore }
          );
        }
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7382/ingest/9e6e0e4d-e4aa-4ee8-a0d7-f373f87445e6', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7b6556' },
      body: JSON.stringify({
        sessionId: '7b6556',
        runId: 'pre-fix',
        hypothesisId: 'C',
        location: 'api/stream/route.ts:success',
        message: 'Direct stream resolved',
        data: {
          via,
          preferBraindance,
          proxy,
          source: resolved.source,
          maxHeight: resolved.maxHeight,
          hasStream: Boolean(resolved.streamUrl),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json(mapResolvedForClient(resolved, proxy), { headers: noStore });
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
