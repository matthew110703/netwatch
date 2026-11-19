import { NextRequest, NextResponse } from 'next/server';
import { historyApi, HistoryItem } from '@/lib/api';
import { getRequestDeviceId } from '@/lib/device';
import { getTmdbImageUrl } from '@/lib/tmdb-image';
import { MediaCardModel } from '@/lib/types';

function mapHistoryItemToCard(item: HistoryItem): MediaCardModel {
  const type: 'movie' | 'tv' = item.media_type === 'tv' ? 'tv' : 'movie';
  const title = item.title || item.name || `Title #${item.id}`;
  const rawDate = item.release_date || item.first_air_date || '';
  const year = typeof rawDate === 'string' && rawDate ? rawDate.split('-')[0] : '';
  const season = item.progress?.season ?? null;
  const episode = item.progress?.episode ?? null;
  const episodeInfo =
    type === 'tv' && season != null && episode != null
      ? `S${season} • E${episode}`
      : undefined;

  return {
    id: item.id,
    type,
    title,
    meta: episodeInfo || (year ? `${type === 'tv' ? 'Series' : 'Film'} • ${year}` : type === 'tv' ? 'Series' : 'Film'),
    episodeInfo,
    resumeSeason: season,
    resumeEpisode: episode,
    progress: Math.min(100, Math.max(0, Math.round(item.progress?.progress ?? 0))),
    imageUrl: getTmdbImageUrl(item.poster_path, 'w500'),
    backdropUrl: getTmdbImageUrl(item.backdrop_path || item.poster_path, 'w1280'),
    rating: typeof item.vote_average === 'number' ? item.vote_average : undefined,
    overview: typeof item.overview === 'string' ? item.overview : undefined,
    year,
    genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : undefined,
  };
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const deviceId = getRequestDeviceId(request);
  const { searchParams } = request.nextUrl;
  const continueWatching = searchParams.get('continueWatching') === '1';
  const limit = Number(searchParams.get('limit')) || 20;
  const page = Number(searchParams.get('page')) || 1;
  const rawType = searchParams.get('mediaType');
  const mediaType = rawType === 'movie' || rawType === 'tv' ? rawType : undefined;

  try {
    const response = continueWatching
      ? await historyApi.getContinueWatching({ limit, mediaType }, deviceId)
      : await historyApi.getHistory({ page, limit, mediaType }, deviceId);

    const items = response.results || [];
    const cards = items.map(mapHistoryItemToCard);

    return NextResponse.json(
      {
        success: true,
        data: items,
        cards,
        page: response.page,
        totalPages: response.total_pages,
        totalResults: response.total_results,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.warn('[History Route] Failed to fetch history:', error);
    return NextResponse.json(
      {
        success: true,
        data: [],
        cards: [],
        page: 1,
        totalPages: 1,
        totalResults: 0,
        fallback: true,
      },
      { headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const deviceId = getRequestDeviceId(request);
  try {
    await historyApi.clearHistory(deviceId);
    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.warn('[History Route] Failed to clear history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear history' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
