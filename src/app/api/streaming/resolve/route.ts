import { NextRequest, NextResponse } from 'next/server';
import { streamingApi } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawType = searchParams.get('type') || 'movie';
  const type = rawType === 'tv' || rawType === 'anilist' ? rawType : 'movie';
  const tmdbId = Number(searchParams.get('tmdbId'));
  const season = Math.max(1, Number(searchParams.get('season')) || 1);
  const episode = Math.max(1, Number(searchParams.get('episode')) || 1);
  const serverId = searchParams.get('serverId') || undefined;

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid tmdbId' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const resolved = await streamingApi.resolveStream({
      type,
      tmdbId,
      season,
      episode,
      serverId,
    });
    return NextResponse.json(
      { success: true, data: resolved },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.warn('[Streaming Resolve Route] Failed to resolve servers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve stream servers' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
