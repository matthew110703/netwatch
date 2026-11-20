const STORAGE_KEY = 'netwatch_stream_prefs';

export type QualityHeightPref = 'auto' | number;

export interface StreamPlaybackPrefs {
  serverId?: string;
  qualityHeight?: QualityHeightPref;
  subtitleLang?: string | 'off';
  playbackSpeed?: number;
  volume?: number;
  muted?: boolean;
}

export type StreamPrefsStore = Record<string, StreamPlaybackPrefs>;

function readStore(): StreamPrefsStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as StreamPrefsStore;
  } catch {
    return {};
  }
}

function writeStore(store: StreamPrefsStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // private mode / quota
  }
}

export function buildStreamPrefsKey(
  mediaType: 'movie' | 'tv',
  tmdbId: number,
  season?: number,
  episode?: number
): string {
  if (mediaType === 'tv') {
    return `tv:${tmdbId}:s${season ?? 1}:e${episode ?? 1}`;
  }
  return `movie:${tmdbId}`;
}

export function getStreamPrefs(key: string): StreamPlaybackPrefs {
  const store = readStore();
  return store[key] ?? {};
}

export function setStreamPrefs(key: string, patch: Partial<StreamPlaybackPrefs>): StreamPlaybackPrefs {
  const store = readStore();
  const next: StreamPlaybackPrefs = { ...store[key], ...patch };
  store[key] = next;
  writeStore(store);
  return next;
}