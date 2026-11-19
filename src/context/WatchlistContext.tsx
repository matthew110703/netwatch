'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MediaCardModel } from '@/lib/types';
import { getClientDeviceId } from '@/lib/device';

interface WatchlistContextType {
  watchlistItems: MediaCardModel[];
  isLoading: boolean;
  isSaved: (id: number, type?: 'movie' | 'tv') => boolean;
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

function getItemKey(id: number, type: 'movie' | 'tv' = 'movie'): string {
  return `${type}:${id}`;
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
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const isSaved = useCallback(
    (id: number, type?: 'movie' | 'tv') =>
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
      const previous = watchlistItems;
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
        console.warn('[WatchlistContext] Sync failed, rolling back optimistic update:', err);
        setWatchlistItems(previous);
        try {
          window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(previous));
        } catch {
          // Ignore storage write errors
        }
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
