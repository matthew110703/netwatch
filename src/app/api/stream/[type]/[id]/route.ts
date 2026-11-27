import { NextRequest, NextResponse } from 'next/server';
import {
  extractStreamCandidates,
  extractSubtitleTracks,
  shouldProxyHls,
  toProxiedHlsUrl,
  type ResolvedDirectStream,
} from '@/lib/vidrift-stream';
import {
  buildVidriftEmbedUrl,
  buildWatchReferer,
  fetchVidriftEmbedHtml,
  parseEmbedMetaFromHtml,
} from '@/lib/vidrift-embed.server';

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
    resolution: 'direct',
    streamUrl: mapUrl(resolved.streamUrl),
    alternateStreams: resolved.alternateStreams.map(mapUrl),
    subtitles: resolved.subtitles.map(mapSub),
    source: resolved.source,
    maxHeight: resolved.maxHeight,
    proxied: proxy,
  };
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
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${hostHeader || request.nextUrl.host}`;
    const referer = buildWatchReferer(origin, type, numId);
    const proxy = shouldProxyHls(hostname) || Boolean(process.env.VERCEL);

    const embedUrl = buildVidriftEmbedUrl(type, numId, seasonNum, episodeNum);
    const { status, data: html } = await fetchVidriftEmbedHtml(embedUrl, referer);

    if (status !== 200) {
      return NextResponse.json(
        { success: false, error: `Upstream error: ${status}` },
        { status: status === 404 ? 404 : 502, headers: noStore }
      );
    }

    const subtitles = extractSubtitleTracks(html);
    const candidates = extractStreamCandidates(html);

    if (candidates.length > 0) {
      const best = candidates[0];
      const resolved: ResolvedDirectStream = {
        streamUrl: best.url,
        alternateStreams: candidates.slice(1).map((c) => c.url),
        source: best.source,
        maxHeight: best.maxHeight ?? null,
        subtitles,
      };
      return NextResponse.json(mapResolvedForClient(resolved, proxy), { headers: noStore });
    }

    const session = parseEmbedMetaFromHtml(html, {
      type,
      tmdbId: numId,
      season: seasonNum,
      episode: episodeNum,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No playback session in upstream embed' },
        { status: 404, headers: noStore }
      );
    }

    const parentHost = session.parentHost || hostname || 'stream-netwatch.vercel.app';

    const sourcePath =
      type === 'tv'
        ? `tv/${numId}/${seasonNum}/${episodeNum}`
        : `movie/${numId}`;

    return NextResponse.json(
      {
        success: true,
        resolution: 'vidrift-session',
        session: {
          playbackToken: session.playbackToken,
          parentHost,
          sourcePath,
          type,
          tmdbId: numId,
          season: type === 'tv' ? seasonNum : undefined,
          episode: type === 'tv' ? episodeNum : undefined,
        },
        subtitles,
        proxied: proxy,
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