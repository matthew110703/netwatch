import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My List',
  description: 'Your personal saved watchlist of movies and TV series on Netwatch.',
  alternates: {
    canonical: '/watchlist',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
