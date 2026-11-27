import { MediaCardModel } from '@/lib/types';

export const HISTORY_STORAGE_KEY = 'netwatch_history';
export const MAX_HISTORY_CACHE_ITEMS = 50;

function itemKey(id: number, type: 'movie' | 'tv'): string {
  return `${type}:${id}`;
}

export function readHistoryCache(): MediaCardModel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MediaCardModel[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeHistoryCache(items: MediaCardModel[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_CACHE_ITEMS)));
  } catch {
    // Ignore quota / privacy errors
  }
}

export function mergeHistoryCards(
  remote: MediaCardModel[],
  local: MediaCardModel[],
  remoteAuthoritative: boolean
): MediaCardModel[] {
  const map = new Map<string, MediaCardModel>();

  for (const item of local) {
    map.set(itemKey(item.id, item.type), item);
  }

  if (remoteAuthoritative && remote.length > 0) {
    for (const item of remote) {
      const key = itemKey(item.id, item.type);
      const prev = map.get(key);
      const prevAt = prev?.updatedAt ? Date.parse(prev.updatedAt) : 0;
      const nextAt = item.updatedAt ? Date.parse(item.updatedAt) : 0;
      if (!prev || nextAt >= prevAt) {
        map.set(key, item);
      }
    }
  } else if (!remoteAuthoritative) {
    for (const item of remote) {
      const key = itemKey(item.id, item.type);
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aT = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bT = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return bT - aT;
  }).slice(0, MAX_HISTORY_CACHE_ITEMS);
}

export interface HistoryCardPatch {
  id: number;
  type: 'movie' | 'tv';
  title?: string;
  imageUrl?: string;
  backdropUrl?: string;
  progress?: number;
  resumeSeason?: number | null;
  resumeEpisode?: number | null;
  episodeInfo?: string;
  year?: string;
  rating?: number;
  meta?: string;
}

export function upsertHistoryCacheEntry(patch: HistoryCardPatch): void {
  const list = readHistoryCache();
  const key = itemKey(patch.id, patch.type);
  const existing = list.find((i) => itemKey(i.id, i.type) === key);
  const updatedAt = new Date().toISOString();

  const next: MediaCardModel = {
    id: patch.id,
    type: patch.type,
    title: patch.title ?? existing?.title ?? `Title #${patch.id}`,
    meta:
      patch.meta ??
      existing?.meta ??
      (patch.type === 'tv' ? 'Series' : 'Film'),
    imageUrl: patch.imageUrl ?? existing?.imageUrl ?? '',
    backdropUrl: patch.backdropUrl ?? existing?.backdropUrl,
    progress: patch.progress ?? existing?.progress,
    resumeSeason: patch.resumeSeason ?? existing?.resumeSeason,
    resumeEpisode: patch.resumeEpisode ?? existing?.resumeEpisode,
    episodeInfo: patch.episodeInfo ?? existing?.episodeInfo,
    year: patch.year ?? existing?.year,
    rating: patch.rating ?? existing?.rating,
    updatedAt,
  };

  const without = list.filter((i) => itemKey(i.id, i.type) !== key);
  writeHistoryCache([next, ...without]);
}