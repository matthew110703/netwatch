'use client';

import React from 'react';
import { MoviesFeed } from '@/components/MoviesFeed';
import { CatalogColdStart } from '@/components/CatalogColdStart';
import { MoviesFeedData } from '@/services/catalog.service';
import { moviesFeedHasContent } from '@/lib/catalog-feed-guards';

export function MoviesPageClient({ initial }: { initial: MoviesFeedData }) {
  return (
    <CatalogColdStart
      initial={initial}
      hasContent={moviesFeedHasContent}
      apiPath="/api/movies"
      loadingLabel="Loading movies catalog…"
    >
      {(feed) => <MoviesFeed {...feed} />}
    </CatalogColdStart>
  );
}