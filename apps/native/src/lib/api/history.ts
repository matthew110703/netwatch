import type { MediaCardModel } from '@netwatch/core';
import { resolveNetwatchBaseUrl } from '../config';
import { getNativeDeviceId } from '../device';

async function headers(): Promise<HeadersInit> {
  const deviceId = await getNativeDeviceId();
  return {
    'x-device-id': deviceId,
    'Content-Type': 'application/json',
  };
}

export interface ProgressStatusResponse {
  media_id: number;
  item_present: boolean;
  data: {
    progress?: {
      currentTime?: number;
      duration?: number;
      progress?: number;
      season?: number | null;
      episode?: number | null;
    };
  } | null;
}

export async function fetchContinueWatching(limit = 12): Promise<MediaCardModel[]> {
  const base = await resolveNetwatchBaseUrl();
  const res = await fetch(`${base}/api/history?continueWatching=1&limit=${limit}`, {
    headers: await headers(),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { cards?: MediaCardModel[] };
  return Array.isArray(json.cards) ? json.cards : [];
}

export async function fetchMediaProgress(
  mediaId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<number> {
  try {
    const base = await resolveNetwatchBaseUrl();
    const params = new URLSearchParams({ mediaType });
    if (mediaType === 'tv' && season != null && episode != null) {
      params.set('season', String(season));
      params.set('episode', String(episode));
    }
    const res = await fetch(`${base}/api/history/${mediaId}?${params.toString()}`, {
      headers: await headers(),
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { success?: boolean; data?: ProgressStatusResponse };
    const prog = json.data?.item_present ? json.data.data?.progress : null;
    if (!prog) return 0;
    if (mediaType === 'tv' && (prog.season !== season || prog.episode !== episode)) {
      return 0;
    }
    return typeof prog.currentTime === 'number' && prog.currentTime > 5 ? prog.currentTime : 0;
  } catch {
    return 0;
  }
}

export async function updateMediaProgress(
  mediaId: number,
  payload: {
    event: 'timeupdate' | 'pause' | 'ended';
    currentTime: number;
    duration: number;
    mediaType: 'movie' | 'tv';
    season?: number | null;
    episode?: number | null;
  }
): Promise<void> {
  if (!mediaId || payload.duration <= 0) return;
  try {
    const base = await resolveNetwatchBaseUrl();
    const progress = Math.min(
      100,
      Math.max(0, Math.round((payload.currentTime / payload.duration) * 100))
    );
    await fetch(`${base}/api/history/${mediaId}`, {
      method: 'PUT',
      headers: await headers(),
      body: JSON.stringify({
        ...payload,
        progress,
      }),
    });
  } catch {
    /* ignore transient sync error */
  }
}
