import { NextRequest, NextResponse } from 'next/server';
import { isAllowedHlsUrl, VIDRIFT_ORIGIN } from '@/lib/vidrift-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${VIDRIFT_ORIGIN}/`,
  Origin: VIDRIFT_ORIGIN,
};

function proxyUrlFor(absoluteUrl: string, request: NextRequest): string {
  const proxy = new URL('/api/hls', request.nextUrl.origin);
  proxy.searchParams.set('url', absoluteUrl);
  return proxy.pathname + proxy.search;
}

function rewriteM3u8(body: string, playlistUrl: string, request: NextRequest): string {
  const base = playlistUrl;
  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/gi, (_, uri: string) => {
          try {
            const absolute = new URL(uri, base).toString();
            if (!isAllowedHlsUrl(absolute)) return `URI="${uri}"`;
            return `URI="${proxyUrlFor(absolute, request)}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
      }

      try {
        const absolute = new URL(trimmed, base).toString();
        if (!isAllowedHlsUrl(absolute)) return line;
        return proxyUrlFor(absolute, request);
      } catch {
        return line;
      }
    })
    .join('\n');
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 });
  }

  const safeUrl = isAllowedHlsUrl(rawUrl);
  if (!safeUrl) {
    return NextResponse.json({ success: false, error: 'Forbidden HLS host' }, { status: 403 });
  }

  try {
    const upstream = await fetch(safeUrl.toString(), {
      headers: UPSTREAM_HEADERS,
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream error: ${upstream.status}` },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isPlaylist =
      contentType.includes('mpegurl') ||
      contentType.includes('m3u8') ||
      safeUrl.pathname.endsWith('.m3u8');

    if (isPlaylist) {
      const text = await upstream.text();
      const rewritten = rewriteM3u8(text, safeUrl.toString(), request);
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'HLS proxy failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
