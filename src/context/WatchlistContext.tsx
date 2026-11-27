'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MediaCardModel, MediaType } from '@/lib/types';
import { getClientDeviceId } from '@/lib/device';

interface WatchlistContextType {
  watchlistItems: MediaCardModel[];
  isLoading: boolean;
  isSaved: (id: number, type?: MediaType) => boolean;
  toggleWatchlist: (item: MediaCardModel) => Promise<void>;
  count: number;
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlistItems: [],
  isLoading: false,
  isSaved: () => false,
  toggleWatchlist: async () => {},
  count: 0,
});

const WATCHLIST_STORAGE_KEY = 'netwatch_watchlist';
const WATCHLIST_PENDING_KEY = 'netwatch_watchlist_pending';

type PendingWatchlistOp =
  | { action: 'add'; item: MediaCardModel }
  | { action: 'remove'; mediaId: number; mediaType: 'movie' | 'tv' };

function getItemKey(id: number, type: MediaType = 'movie'): string {
  return `${type}:${id}`;
}

function readPendingOps(): PendingWatchlistOp[] {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingWatchlistOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingOps(ops: PendingWatchlistOp[]): void {
  try {
    if (ops.length === 0) {
      window.localStorage.removeItem(WATCHLIST_PENDING_KEY);
    } else {
      window.localStorage.setItem(WATCHLIST_PENDING_KEY, JSON.stringify(ops));
    }
  } catch {
    // Ignore storage errors
  }
}

async function flushPendingWatchlistOps(deviceId: string): Promise<void> {
  let pending = readPendingOps();
  if (pending.length === 0) return;

  const remaining: PendingWatchlistOp[] = [];
  for (const op of pending) {
    try {
      if (op.action === 'add') {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-id': deviceId,
          },
          body: JSON.stringify({
            mediaId: op.item.id,
            mediaType: op.item.type,
          }),
        });
        if (!res.ok) remaining.push(op);
      } else {
        const res = await fetch(
          `/api/watchlist?mediaId=${op.mediaId}&mediaType=${op.mediaType}`,
          {
            method: 'DELETE',
            headers: { 'x-device-id': deviceId },
          }
        );
        if (!res.ok) remaining.push(op);
      }
    } catch {
      remaining.push(op);
    }
  }
  writePendingOps(remaining);
}

export const WatchlistProvider: React.FC<{
  initialItems?: MediaCardModel[];
  children: React.ReactNode;
}> = ({ initialItems = [], children }) => {
  const [watchlistItems, setWatchlistItems] = useState<MediaCardModel[]>(initialItems);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from per-device backend watchlist & localStorage on mount
  useEffect(() => {
    let active = true;
    const deviceId = getClientDeviceId();

    const hydrate = async () => {
      let localItems: MediaCardModel[] = [];
      try {
        const stored = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as MediaCardModel[];
          if (Array.isArray(parsed)) {
            localItems = parsed;
          }
        }
      } catch {
        // Ignore localStorage parse errors
      }

      let remoteCards: MediaCardModel[] | null = null;
      try {
        const res = await fetch('/api/watchlist', {
          headers: { 'x-device-id': deviceId },
        });
        if (res.ok) {
          const json = (await res.json()) as {
            success?: boolean;
            cards?: MediaCardModel[];
            fallback?: boolean;
          };
          if (json.success && !json.fallback && Array.isArray(json.cards)) {
            remoteCards = json.cards;
          }
        }
      } catch {
        // Fallback to local items when backend is unreachable
      }

      if (!active) return;

      const combinedMap = new Map<string, MediaCardModel>();
      if (remoteCards !== null) {
        remoteCards.forEach((item) =>
          combinedMap.set(getItemKey(item.id, item.type), item)
        );
        // Keep local entries if remote returned empty only when offline/fallback; otherwise remote is authoritative
        if (remoteCards.length === 0 && localItems.length > 0) {
          localItems.forEach((item) =>
            combinedMap.set(getItemKey(item.id, item.type), item)
          );
        }
      } else {
        localItems.forEach((item) =>
          combinedMap.set(getItemKey(item.id, item.type), item)
        );
      }

      const nextList = Array.from(combinedMap.values());
      setWatchlistItems(nextList);
      try {
        window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(nextList));
      } catch {
        // Ignore storage write errors
      }
      setIsLoading(false);
      await flushPendingWatchlistOps(deviceId);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const isSaved = useCallback(
    (id: number, type?: MediaType) =>
      watchlistItems.some((item) =>
        type ? item.id === id && item.type === type : item.id === id
      ),
    [watchlistItems]
  );

  const toggleWatchlist = useCallback(
    async (item: MediaCardModel) => {
      const exists = watchlistItems.some(
        (existing) => existing.id === item.id && existing.type === item.type
      );
      const updated = exists
        ? watchlistItems.filter(
            (existing) => !(existing.id === item.id && existing.type === item.type)
          )
        : [item, ...watchlistItems];

      setWatchlistItems(updated);
      try {
        window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage write errors
      }

      if (item.type === 'anime') {
        return;
      }

      const deviceId = getClientDeviceId();

      try {
        const res = exists
          ? await fetch(
              `/api/watchlist?mediaId=${item.id}&mediaType=${item.type}`,
              {
                method: 'DELETE',
                headers: { 'x-device-id': deviceId },
              }
            )
          : await fetch('/api/watchlist', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-device-id': deviceId,
              },
              body: JSON.stringify({
                mediaId: item.id,
                mediaType: item.type,
              }),
            });

        if (!res.ok) {
          throw new Error(`Watchlist sync HTTP ${res.status}`);
        }
      } catch (err) {
        console.warn('[WatchlistContext] Sync failed, keeping local list and queueing retry:', err);
        const pending = readPendingOps();
        if (exists) {
          pending.push({
            action: 'remove',
            mediaId: item.id,
            mediaType: item.type === 'tv' ? 'tv' : 'movie',
          });
        } else {
          pending.push({ action: 'add', item });
        }
        writePendingOps(pending);
      }
    },
    [watchlistItems]
  );

  const value = useMemo(
    () => ({
      watchlistItems,
      isLoading,
      isSaved,
      toggleWatchlist,
      count: watchlistItems.length,
    }),
    [watchlistItems, isLoading, isSaved, toggleWatchlist]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => useContext(WatchlistContext);
