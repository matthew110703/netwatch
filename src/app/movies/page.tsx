import { Metadata } from 'next';
import { MoviesPageClient } from '@/components/MoviesPageClient';
import { JsonLd } from '@/components/JsonLd';
import { getMoviesFeedData } from '@/services/catalog.service';
import { buildBreadcrumbJsonLd, buildItemListJsonLd, SITE_NAME } from '@/lib/seo';
import { strings } from './strings';

export const metadata: Metadata = {
  title: strings.metadata.title,
  description: strings.metadata.description,
  alternates: {
    canonical: '/movies',
  },
  openGraph: {
    title: `${strings.metadata.title} | ${SITE_NAME}`,
    description: strings.metadata.description,
    type: 'website',
    url: '/movies',
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

export default async function MoviesPage() {
  const feedData = await getMoviesFeedData();

  const listItems = feedData.popularMovies.map((movie) => ({
    name: movie.title,
    path: `/movie/${movie.id}`,
    image: movie.imageUrl,
  }));

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Movies', path: '/movies' },
        ])}
      />
      {listItems.length > 0 && (
        <JsonLd data={buildItemListJsonLd('Popular Movies on Netwatch', listItems)} />
      )}
      {!feedData.spotlightMovie && (
        <h1 className="sr-only">Movies Catalog — Netwatch</h1>
      )}
      <MoviesPageClient initial={feedData} />
    </>
  );
}
