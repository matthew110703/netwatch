import { NextRequest, NextResponse } from 'next/server';
import { watchlistApi, WatchlistHydratedItem } from '@/lib/api';
import { getRequestDeviceId } from '@/lib/device';
import { mapTmdbMovieToCard, mapTmdbTvToCard } from '@/lib/tmdb-image';
import { MediaCardModel, TMDBMovie, TMDBTvShow } from '@/lib/types';

function mapWatchlistItemToCard(item: WatchlistHydratedItem): MediaCardModel {
  if (item.media_type === 'tv' || 'name' in item) {
    return mapTmdbTvToCard(item as TMDBTvShow);
  }
  return mapTmdbMovieToCard(item as TMDBMovie);
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const deviceId = getRequestDeviceId(request);
  try {
    const list = await watchlistApi.getWatchlist(deviceId);
    const rawResults = list?.results || [];
    const cards = rawResults.map(mapWatchlistItemToCard);
    return NextResponse.json({ success: true, data: rawResults, cards }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.warn('[Watchlist Route] Failed to fetch from Braindance:', error);
    return NextResponse.json(
      { success: true, data: [], cards: [], fallback: true },
      { headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  const deviceId = getRequestDeviceId(request);
  try {
    const body = (await request.json()) as {
      mediaId?: number | string;
      media_id?: number | string;
      mediaType?: string;
      media_type?: string;
    };
    const mediaId = Number(body.mediaId || body.media_id);
    const rawType = body.mediaType || body.media_type;
    const mediaType: 'movie' | 'tv' = rawType === 'tv' ? 'tv' : 'movie';

    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing mediaId' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    const result = await watchlistApi.addToWatchlist(mediaId, mediaType, deviceId);
    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.warn('[Watchlist Route] Failed to add to Braindance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add item' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const deviceId = getRequestDeviceId(request);
  const { searchParams } = new URL(request.url);
  const mediaId = Number(searchParams.get('mediaId'));
  const rawType = searchParams.get('mediaType') || searchParams.get('media_type');
  const mediaType = rawType === 'movie' || rawType === 'tv' ? rawType : undefined;

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Missing mediaId' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const result = await watchlistApi.removeFromWatchlist(mediaId, mediaType, deviceId);
    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.warn('[Watchlist Route] Failed to delete from Braindance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove item' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
