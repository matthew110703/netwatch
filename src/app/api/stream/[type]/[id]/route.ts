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
import { resolvePlaybackViaBraindance } from '@/lib/vidrift-playback.braindance';
import { ApiClientError } from '@/lib/api/client';

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

    const parentHost = hostname || 'stream-netwatch.vercel.app';

    const resolveFromEmbedHtml = (html: string) => {
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
        return mapResolvedForClient(resolved, proxy);
      }

      const session = parseEmbedMetaFromHtml(html, {
        type,
        tmdbId: numId,
        season: seasonNum,
        episode: episodeNum,
      });

      if (!session) {
        return null;
      }

      const sourcePath =
        type === 'tv' ? `tv/${numId}/${seasonNum}/${episodeNum}` : `movie/${numId}`;

      return {
        success: true,
        resolution: 'vidrift-session',
        session: {
          playbackToken: session.playbackToken,
          parentHost: session.parentHost || parentHost,
          sourcePath,
          type,
          tmdbId: numId,
          season: type === 'tv' ? seasonNum : undefined,
          episode: type === 'tv' ? episodeNum : undefined,
        },
        subtitles,
        proxied: proxy,
      };
    };

    const preferBraindanceFirst = Boolean(process.env.VERCEL);
    let lastUpstreamStatus: number | null = null;

    const tryBraindance = async () => {
      const playback = await resolvePlaybackViaBraindance({
        type,
        tmdbId: numId,
        season: seasonNum,
        episode: episodeNum,
        referer,
        parentHost,
      });

      if (playback.resolution === 'direct') {
        const { resolution: _resolution, ...resolved } = playback;
        return mapResolvedForClient(resolved, proxy);
      }

      return {
        success: true,
        resolution: 'vidrift-session',
        session: {
          ...playback.session,
          parentHost: playback.session.parentHost || parentHost,
        },
        subtitles: playback.subtitles,
        proxied: proxy,
      };
    };

    const tryLocalEmbed = async () => {
      const embedUrl = buildVidriftEmbedUrl(type, numId, seasonNum, episodeNum);
      const { status, data: html } = await fetchVidriftEmbedHtml(embedUrl, referer);
      lastUpstreamStatus = status;
      if (status !== 200) return null;
      return resolveFromEmbedHtml(html);
    };

    if (preferBraindanceFirst) {
      try {
        const payload = await tryBraindance();
        return NextResponse.json(payload, { headers: noStore });
      } catch (braindanceErr) {
        const localPayload = await tryLocalEmbed();
        if (localPayload) {
          return NextResponse.json(localPayload, { headers: noStore });
        }
        const message =
          braindanceErr instanceof ApiClientError
            ? braindanceErr.message
            : braindanceErr instanceof Error
              ? braindanceErr.message
              : 'Stream resolution failed';
        return NextResponse.json(
          {
            success: false,
            error: lastUpstreamStatus ? `Upstream error: ${lastUpstreamStatus}` : message,
          },
          { status: 502, headers: noStore }
        );
      }
    }

    const localPayload = await tryLocalEmbed();
    if (localPayload) {
      return NextResponse.json(localPayload, { headers: noStore });
    }

    if (lastUpstreamStatus !== 200) {
      try {
        const payload = await tryBraindance();
        return NextResponse.json(payload, { headers: noStore });
      } catch {
        return NextResponse.json(
          { success: false, error: `Upstream error: ${lastUpstreamStatus ?? 403}` },
          { status: lastUpstreamStatus === 404 ? 404 : 502, headers: noStore }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'No playback session in upstream embed' },
      { status: 404, headers: noStore }
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