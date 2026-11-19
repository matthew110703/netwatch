import { NextRequest, NextResponse } from 'next/server';
import { tvApi } from '@/lib/api';
import { getTmdbImageUrl } from '@/lib/tmdb-image';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; season: string }> }
) {
  const { id, season } = await params;
  const tvId = Number(id);
  const seasonNum = Number(season);

  if (!Number.isInteger(tvId) || tvId <= 0 || !Number.isInteger(seasonNum) || seasonNum < 0) {
    return NextResponse.json({ success: false, error: 'Invalid TV or season ID' }, { status: 400 });
  }

  try {
    const seasonData = await tvApi.getSeasonDetails(tvId, seasonNum);
    const episodes = (seasonData.episodes || []).map((ep) => ({
      ...ep,
      season_number: ep.season_number ?? seasonNum,
      stillUrl: ep.still_path ? getTmdbImageUrl(ep.still_path, 'w500') : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...seasonData,
        episodes,
      },
    });
  } catch (error) {
    console.warn(`[Season Route] Failed to fetch TV ${tvId} S${seasonNum}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch season episodes' },
      { status: 502 }
    );
  }
}
