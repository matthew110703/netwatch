import { Metadata } from 'next';
import { TvFeed } from '@/components/TvFeed';
import { JsonLd } from '@/components/JsonLd';
import { getTvFeedData } from '@/services/catalog.service';
import { buildBreadcrumbJsonLd, buildItemListJsonLd, SITE_NAME } from '@/lib/seo';
import { strings } from './strings';

export const metadata: Metadata = {
  title: strings.metadata.title,
  description: strings.metadata.description,
  alternates: {
    canonical: '/tv',
  },
  openGraph: {
    title: `${strings.metadata.title} | ${SITE_NAME}`,
    description: strings.metadata.description,
    type: 'website',
    url: '/tv',
    siteName: SITE_NAME,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${strings.metadata.title} | ${SITE_NAME}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${strings.metadata.title} | ${SITE_NAME}`,
    description: strings.metadata.description,
    images: ['/twitter-image'],
  },
};

export const revalidate = 120;

export default async function TvPage() {
  const feedData = await getTvFeedData();

  const listItems = feedData.popularTv.map((show) => ({
    name: show.title,
    path: `/tv/${show.id}`,
    image: show.imageUrl,
  }));

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'TV Shows', path: '/tv' },
        ])}
      />
      {listItems.length > 0 && (
        <JsonLd data={buildItemListJsonLd('Popular TV Shows on Netwatch', listItems)} />
      )}
      {!feedData.spotlightTv && (
        <h1 className="sr-only">TV Shows Catalog — Netwatch</h1>
      )}
      <TvFeed {...feedData} />
    </>
  );
}
