import { Metadata } from 'next';
import { AnimePageClient } from '@/components/AnimePageClient';
import { getAnimeFeedData } from '@/services/anime-catalog.service';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Anime',
  description: 'Trending, popular, and airing anime from AniList on Netwatch.',
  alternates: { canonical: '/anime' },
  openGraph: {
    title: `Anime | ${SITE_NAME}`,
    description: 'Discover and stream anime with multi-provider playback.',
    type: 'website',
    url: '/anime',
    siteName: SITE_NAME,
  },
};

export const revalidate = 300;

export default async function AnimePage() {
  const feedData = await getAnimeFeedData();

  return (
    <>
      {!feedData.spotlightAnime && <h1 className="sr-only">Anime Catalog — Netwatch</h1>}
      <AnimePageClient initial={feedData} />
    </>
  );
}