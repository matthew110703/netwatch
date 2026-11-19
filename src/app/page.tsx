import { Metadata } from 'next';
import { HomeFeed } from '@/components/HomeFeed';
import { getHomeFeedData } from '@/services/catalog.service';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';
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

export const revalidate = 120; // 2 minutes cache revalidation

export default async function HomePage() {
  const feedData = await getHomeFeedData();

  return (
    <>
      {!feedData.billboardItem && (
        <h1 className="sr-only">Netwatch — Stream Movies and TV Shows</h1>
      )}
      <HomeFeed {...feedData} />
    </>
  );
}
