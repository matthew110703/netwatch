import type { MediaCardModel } from '@netwatch/core';
import { resolveNetwatchBaseUrl } from '../config';
import { getNativeDeviceId } from '../device';

async function headers(): Promise<HeadersInit> {
  const deviceId = await getNativeDeviceId();
  return { 'x-device-id': deviceId, 'Content-Type': 'application/json' };
}

export async function fetchWatchlist(): Promise<MediaCardModel[]> {
  const base = await resolveNetwatchBaseUrl();
  const res = await fetch(`${base}/api/watchlist`, { headers: await headers() });
  if (!res.ok) throw new Error(`Watchlist failed (${res.status})`);
  const json = (await res.json()) as { cards?: MediaCardModel[] };
  return Array.isArray(json.cards) ? json.cards : [];
}

export async function addToWatchlist(
  mediaId: number,
  mediaType: 'movie' | 'tv'
): Promise<void> {
  const base = await resolveNetwatchBaseUrl();
  const res = await fetch(`${base}/api/watchlist`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ mediaId, mediaType }),
  });
  if (!res.ok) throw new Error(`Add to list failed (${res.status})`);
}

export async function removeFromWatchlist(
  mediaId: number,
  mediaType: 'movie' | 'tv'
): Promise<void> {
  const base = await resolveNetwatchBaseUrl();
  const params = new URLSearchParams({
    mediaId: String(mediaId),
    mediaType,
  });
  const res = await fetch(`${base}/api/watchlist?${params.toString()}`, {
    method: 'DELETE',
    headers: await headers(),
  });
  if (!res.ok) throw new Error(`Remove from list failed (${res.status})`);
}
