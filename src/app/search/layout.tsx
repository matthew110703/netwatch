import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Catalog',
  description: 'Search movies and TV shows across the Netwatch catalog.',
  alternates: {
    canonical: '/search',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
