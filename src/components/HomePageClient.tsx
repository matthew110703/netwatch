'use client';

import React from 'react';
import { HomeFeed } from '@/components/HomeFeed';
import { CatalogColdStart } from '@/components/CatalogColdStart';
import { HomeFeedData } from '@/services/catalog.service';
import { homeFeedHasContent } from '@/lib/catalog-feed-guards';

interface HomePageClientProps {
  initial: HomeFeedData;
  region: string;
}

export function HomePageClient({ initial, region }: HomePageClientProps) {
  return (
    <CatalogColdStart
      initial={initial}
      hasContent={homeFeedHasContent}
      apiPath="/api/home"
      apiQuery={`region=${encodeURIComponent(region)}`}
      loadingLabel="Waking Braindance uplink…"
    >
      {(feed) => <HomeFeed {...feed} />}
    </CatalogColdStart>
  );
}