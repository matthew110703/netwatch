import type { MediaCardModel } from '@netwatch/core';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  addToWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
} from '@/lib/api/watchlist';
import { safeGetItem, safeSetItem } from '@/lib/storage';

interface WatchlistContextValue {
  watchlistItems: MediaCardModel[];
  isLoading: boolean;
  count: number;
  isSaved: (id: number, type?: 'movie' | 'tv') => boolean;
  toggleWatchlist: (item: MediaCardModel) => Promise<void>;
  refreshWatchlist: () => Promise<void>;
}

const STORAGE_KEY = 'netwatch_native_watchlist_v1';

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlistItems: [],
  isLoading: false,
  count: 0,
  isSaved: () => false,
  toggleWatchlist: async () => {},
  refreshWatchlist: async () => {},
});

function itemKey(id: number, type: 'movie' | 'tv' = 'movie'): string {
  return `${type}:${id}`;
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlistItems, setWatchlistItems] = useState<MediaCardModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const persistLocal = useCallback(async (items: MediaCardModel[]) => {
    await safeSetItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const refreshWatchlist = useCallback(async () => {
    setIsLoading(true);
    let localItems: MediaCardModel[] = [];
    try {
      const raw = await safeGetItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MediaCardModel[];
        if (Array.isArray(parsed)) localItems = parsed;
      }
    } catch {
      /* ignore */
    }

    try {
      const remote = await fetchWatchlist();
      const merged = new Map<string, MediaCardModel>();
      for (const item of remote) {
        merged.set(itemKey(item.id, item.type), item);
      }
      if (remote.length === 0 && localItems.length > 0) {
        for (const item of localItems) {
          merged.set(itemKey(item.id, item.type), item);
        }
      }
      const next = Array.from(merged.values());
      setWatchlistItems(next);
      void persistLocal(next);
    } catch {
      if (localItems.length > 0) {
        setWatchlistItems(localItems);
      }
    } finally {
      setIsLoading(false);
    }
  }, [persistLocal]);

  useEffect(() => {
    void refreshWatchlist();
  }, [refreshWatchlist]);

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
      void persistLocal(updated);

      try {
        if (exists) {
          await removeFromWatchlist(item.id, item.type);
        } else {
          await addToWatchlist(item.id, item.type);
        }
      } catch {
        setWatchlistItems(previous);
        void persistLocal(previous);
      }
    },
    [watchlistItems, persistLocal]
  );

  const value = useMemo<WatchlistContextValue>(
    () => ({
      watchlistItems,
      isLoading,
      count: watchlistItems.length,
      isSaved,
      toggleWatchlist,
      refreshWatchlist,
    }),
    [watchlistItems, isLoading, isSaved, toggleWatchlist, refreshWatchlist]
  );

  return (
    <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
  );
}

export function useWatchlist(): WatchlistContextValue {
  return useContext(WatchlistContext);
}
