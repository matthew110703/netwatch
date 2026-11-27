'use client';

import React from 'react';
import { TvFeed } from '@/components/TvFeed';
import { CatalogColdStart } from '@/components/CatalogColdStart';
import { TvFeedData } from '@/services/catalog.service';
import { tvFeedHasContent } from '@/lib/catalog-feed-guards';

export function TvPageClient({ initial }: { initial: TvFeedData }) {
  return (
    <CatalogColdStart
      initial={initial}
      hasContent={tvFeedHasContent}
      apiPath="/api/tv"
      loadingLabel="Loading TV catalog…"
    >
      {(feed) => <TvFeed {...feed} />}
    </CatalogColdStart>
  );
}