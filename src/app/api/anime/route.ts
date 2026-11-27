import { NextResponse } from 'next/server';
import { getAnimeFeedData } from '@/services/anime-catalog.service';
import { ANILIST_CACHE_HEADERS } from '@/lib/anilist/client';
import { animeFeedHasContent } from '@/lib/catalog-feed-guards';

export async function GET() {
  try {
    const data = await getAnimeFeedData();
    return NextResponse.json(
      {
        success: true,
        data,
        hasContent: animeFeedHasContent(data),
      },
      { headers: ANILIST_CACHE_HEADERS as Record<string, string> }
    );
  } catch (error) {
    console.error('[API /anime]', error);
    return NextResponse.json({ success: false, data: null }, { status: 503 });
  }
}