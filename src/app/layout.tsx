import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { NetwatchProviders } from './providers';
import { TopNavBar } from '@/modules/navigation/TopNavBar';
import { BottomNavBar } from '@/modules/navigation/BottomNavBar';
import { NetwatchLogo } from '@/components/NetwatchLogo';
import { JsonLd } from '@/components/JsonLd';
import {
  buildWebsiteJsonLd,
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
} from '@/lib/seo';
import { strings } from './strings';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter-next',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9ff' },
    { media: '(prefers-color-scheme: dark)', color: '#131313' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  category: 'entertainment',
  keywords: SITE_KEYWORDS,
  title: {
    default: strings.metadata.title,
    template: '%s | Netwatch',
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: strings.metadata.title,
    description: SITE_DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: strings.metadata.title,
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
};

const THEME_PREHYDRATION_SCRIPT = `(function(){try{var t=localStorage.getItem('netwatch-theme');if(t==='obsidian'||t==='luminous'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="luminous"
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <script dangerouslySetInnerHTML={{ __html: THEME_PREHYDRATION_SCRIPT }} />
      </head>
      <body className="bg-[var(--rd-color-background,#f8f9ff)] font-body-md text-[var(--rd-color-on-surface,#0b1c30)] min-h-screen flex flex-col selection:bg-[var(--rd-color-primary-container)] selection:text-[var(--rd-color-on-primary-container)]">
        <JsonLd data={buildWebsiteJsonLd()} />
        <NetwatchProviders>
          <Suspense fallback={<div className="h-16 w-full bg-[var(--rd-color-surface-container-lowest,#ffffff)]/80" />}>
            <TopNavBar />
          </Suspense>

          <main className="w-full pt-16 flex-1 bg-[var(--rd-color-surface)]">
            {children}
          </main>

          {/* Clean Design System Footer */}
          <footer className="w-full bg-[var(--rd-color-surface-container-lowest)] border-t border-[var(--rd-color-outline-variant)]/30 py-8 pb-24 md:pb-8">
            <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <Link className="flex items-center" href="/" aria-label="Netwatch Home">
                    <NetwatchLogo size="sm" />
                  </Link>
                  <span className="hidden sm:inline-block text-[var(--rd-color-outline,#737686)] font-body-sm">•</span>
                  <p className="font-body-sm text-xs text-[var(--rd-color-on-surface-variant,#434655)]">
                    {strings.footer.copyright}
                  </p>
                </div>

                <nav
                  aria-label="Footer navigation"
                  className="flex flex-wrap items-center justify-center gap-5 text-sm text-[var(--rd-color-on-surface-variant,#434655)]"
                >
                  <Link className="hover:text-[var(--rd-color-on-surface)] transition-colors" href="/">
                    Home
                  </Link>
                  <Link className="hover:text-[var(--rd-color-on-surface)] transition-colors" href="/movies">
                    Movies
                  </Link>
                  <Link className="hover:text-[var(--rd-color-on-surface)] transition-colors" href="/tv">
                    TV Shows
                  </Link>
                  <Link className="hover:text-[var(--rd-color-on-surface)] transition-colors" href="/watchlist">
                    My List
                  </Link>
                  <Link className="hover:text-[var(--rd-color-on-surface)] transition-colors" href="/search">
                    Search
                  </Link>
                </nav>
              </div>
            </div>
          </footer>

          <Suspense fallback={null}>
            <BottomNavBar />
          </Suspense>
        </NetwatchProviders>
      </body>
    </html>
  );
}
