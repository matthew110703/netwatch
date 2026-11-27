import { Metadata } from 'next';
import { HomePageClient } from '@/components/HomePageClient';
import { getHomeFeedData } from '@/services/catalog.service';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';
import { resolveHomeRegion } from '@/lib/region.server';
import { strings } from './strings';

export const metadata: Metadata = {
  title: strings.metadata.title,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: strings.metadata.title,
    description: SITE_DESCRIPTION,
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: strings.metadata.title,
    description: SITE_DESCRIPTION,
  },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const region = await resolveHomeRegion();
  const feedData = await getHomeFeedData(region);

  return (
    <>
      {!feedData.billboardItem && (
        <h1 className="sr-only">Netwatch — Stream Movies and TV Shows</h1>
      )}
      <HomePageClient initial={feedData} region={region} />
    </>
  );
}
