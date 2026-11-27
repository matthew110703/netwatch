'use client';

import { useCallback, useEffect, useState } from 'react';
import { getClientDeviceId } from '@/lib/device';
import {
  mergeHistoryCards,
  readHistoryCache,
  writeHistoryCache,
} from '@/lib/history-cache';
import { MediaCardModel } from '@/lib/types';

interface UseWatchHistoryOptions {
  limit?: number;
  mediaType?: 'movie' | 'tv';
  /** When true, uses continue-watching filter (1–95% progress, not ended). */
  continueWatchingOnly?: boolean;
}

export function useWatchHistory(options: UseWatchHistoryOptions = {}) {
  const { limit = 24, mediaType, continueWatchingOnly = false } = options;
  const [items, setItems] = useState<MediaCardModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hydrate = useCallback(async () => {
    const local = readHistoryCache();
    if (local.length > 0) {
      setItems(
        local.filter((i) => (mediaType ? i.type === mediaType : true)).slice(0, limit)
      );
    }

    const deviceId = getClientDeviceId();
    const params = new URLSearchParams({ limit: String(limit) });
    if (continueWatchingOnly) params.set('continueWatching', '1');
    if (mediaType) params.set('mediaType', mediaType);

    try {
      const res = await fetch(`/api/history?${params.toString()}`, {
        headers: { 'x-device-id': deviceId },
      });
      if (!res.ok) {
        setIsLoading(false);
        return;
      }
      const json = (await res.json()) as {
        cards?: MediaCardModel[];
        fallback?: boolean;
      };
      const remote = Array.isArray(json.cards) ? json.cards : [];
      const authoritative = Boolean(remote.length && !json.fallback);
      const merged = mergeHistoryCards(remote, local, authoritative);
      writeHistoryCache(merged);
      setItems(merged.filter((i) => (mediaType ? i.type === mediaType : true)).slice(0, limit));
    } catch {
      // Keep local cache painted
    } finally {
      setIsLoading(false);
    }
  }, [continueWatchingOnly, limit, mediaType]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const removeFromHistory = useCallback(
    async (item: MediaCardModel) => {
      const deviceId = getClientDeviceId();
      const next = readHistoryCache().filter(
        (i) => !(i.id === item.id && i.type === item.type)
      );
      writeHistoryCache(next);
      setItems((prev) => prev.filter((i) => !(i.id === item.id && i.type === item.type)));

      try {
        await fetch(
          `/api/history/${item.id}?mediaType=${item.type}`,
          { method: 'DELETE', headers: { 'x-device-id': deviceId } }
        );
      } catch {
        // Local removal stays
      }
    },
    []
  );

  return { items, isLoading, refresh: hydrate, removeFromHistory };
}