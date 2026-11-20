import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import {
  VIDRIFT_ORIGIN,
  extractStreamCandidates,
  extractSubtitleTracks,
  shouldProxyHls,
  toProxiedHlsUrl,
} from '@/lib/vidrift-stream';

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

    const subtitles = extractSubtitleTracks(html);
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

    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const hostname = hostHeader.split(':')[0] || '';
    const proxy = shouldProxyHls(hostname) || Boolean(process.env.VERCEL);
    const mapUrl = (url: string) => (proxy ? toProxiedHlsUrl(url) : url);

    const best = candidates[0];

    return NextResponse.json(
      {
        success: true,
        streamUrl: mapUrl(best.url),
        alternateStreams: candidates.slice(1).map((c) => mapUrl(c.url)),
        subtitles,
        source: best.source,
        maxHeight: best.maxHeight ?? null,
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
