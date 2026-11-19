import { NextRequest, NextResponse } from 'next/server';
import { historyApi, PlaybackEvent } from '@/lib/api';
import { getRequestDeviceId } from '@/lib/device';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const numId = Number(mediaId);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid mediaId' }, { status: 400 });
  }

  const deviceId = getRequestDeviceId(request);
  const { searchParams } = request.nextUrl;
  const rawType = searchParams.get('mediaType');
  const mediaType = rawType === 'movie' || rawType === 'tv' ? rawType : undefined;
  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const season = seasonParam !== null ? Number(seasonParam) : undefined;
  const episode = episodeParam !== null ? Number(episodeParam) : undefined;

  try {
    const data = await historyApi.getProgress(numId, deviceId, {
      mediaType,
      season: Number.isFinite(season) ? season : undefined,
      episode: Number.isFinite(episode) ? episode : undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.warn('[History Item Route] Failed to load progress:', error);
    return NextResponse.json({
      success: true,
      data: { media_id: numId, item_present: false, data: null },
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const numId = Number(mediaId);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid mediaId' }, { status: 400 });
  }

  const deviceId = getRequestDeviceId(request);

  try {
    const body = (await request.json()) as {
      event?: PlaybackEvent;
      currentTime?: number;
      duration?: number;
      progress?: number;
      mediaType?: 'movie' | 'tv';
      season?: number | null;
      episode?: number | null;
    };

    const currentTime = Math.max(0, Number(body.currentTime ?? 0));
    const duration = Math.max(0, Number(body.duration ?? 0));
    const progress = Math.min(100, Math.max(0, Number(body.progress ?? 0)));
    const event: PlaybackEvent = body.event || 'timeupdate';

    const data = await historyApi.updateProgress(
      numId,
      {
        event,
        currentTime,
        duration,
        progress,
        mediaType: body.mediaType === 'tv' ? 'tv' : 'movie',
        season: body.season ?? null,
        episode: body.episode ?? null,
      },
      deviceId
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.warn('[History Item Route] Failed to update progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const numId = Number(mediaId);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid mediaId' }, { status: 400 });
  }

  const deviceId = getRequestDeviceId(request);
  const rawType = request.nextUrl.searchParams.get('mediaType');
  const mediaType = rawType === 'movie' || rawType === 'tv' ? rawType : undefined;

  try {
    await historyApi.removeHistoryItem(numId, mediaType, deviceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn('[History Item Route] Failed to delete item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove history item' },
      { status: 500 }
    );
  }
}
