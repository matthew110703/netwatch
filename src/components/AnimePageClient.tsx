'use client';

import React from 'react';
import { AnimeFeed } from '@/components/AnimeFeed';
import { CatalogColdStart } from '@/components/CatalogColdStart';
import type { AnimeFeedData } from '@/services/anime-catalog.service';
import { animeFeedHasContent } from '@/lib/catalog-feed-guards';

interface AnimePageClientProps {
  initial: AnimeFeedData;
}

export function AnimePageClient({ initial }: AnimePageClientProps) {
  return (
    <CatalogColdStart
      initial={initial}
      hasContent={animeFeedHasContent}
      apiPath="/api/anime"
      loadingLabel="Waking AniList uplink…"
    >
      {(feed) => <AnimeFeed {...feed} />}
    </CatalogColdStart>
  );
}