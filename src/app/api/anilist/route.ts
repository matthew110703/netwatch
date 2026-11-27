import { NextRequest, NextResponse } from 'next/server';
import {
  getAnimeDetailData,
  getAnimeFeedData,
  searchAniList,
} from '@/services/anime-catalog.service';
import { ANILIST_CACHE_HEADERS, AniListRateLimitError } from '@/lib/anilist/client';

type AniListOperation = 'landing' | 'detail' | 'search';

export async function POST(request: NextRequest) {
  let body: { operation?: AniListOperation; id?: number; search?: string; page?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const operation = body.operation;
  if (!operation || !['landing', 'detail', 'search'].includes(operation)) {
    return NextResponse.json({ success: false, error: 'Invalid operation' }, { status: 400 });
  }

  try {
    if (operation === 'landing') {
      const data = await getAnimeFeedData();
      return NextResponse.json(
        { success: true, data },
        { headers: ANILIST_CACHE_HEADERS as Record<string, string> }
      );
    }

    if (operation === 'detail') {
      const id = Number(body.id);
      if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
      }
      const data = await getAnimeDetailData(id);
      if (!data) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json(
        { success: true, data },
        { headers: ANILIST_CACHE_HEADERS as Record<string, string> }
      );
    }

    const search = body.search?.trim() ?? '';
    const page = Math.max(1, Number(body.page) || 1);
    const data = await searchAniList(search, page);
    return NextResponse.json(
      { success: true, data },
      { headers: ANILIST_CACHE_HEADERS as Record<string, string> }
    );
  } catch (error) {
    if (error instanceof AniListRateLimitError) {
      return NextResponse.json(
        { success: false, error: 'AniList rate limited', retryAfter: error.retryAfterSec },
        { status: 503, headers: { 'Retry-After': String(error.retryAfterSec) } }
      );
    }
    console.error('[API /anilist]', error);
    return NextResponse.json({ success: false, error: 'Upstream error' }, { status: 500 });
  }
}