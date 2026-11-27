import type { PlaybackPrefs } from '@ripperdoc-chrome77/player';

export const DEFAULT_PLAYBACK_PREFS: PlaybackPrefs = {
  volume: 1,
  muted: false,
  playbackSpeed: 1,
};

export function parseWatchMediaType(raw: string): 'movie' | 'tv' | null {
  return raw === 'movie' || raw === 'tv' ? raw : null;
}

export function parsePositiveInt(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}