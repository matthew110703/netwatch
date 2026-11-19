import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Film, Home, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Title Not Found',
  description: 'The requested movie, series, or page could not be found on Netwatch.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFoundPage() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)]">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[var(--rd-color-surface-container)] border border-[var(--rd-color-outline-variant)]/40 shadow-xl space-y-5">
        <div className="w-16 h-16 rounded-full bg-[var(--rd-color-primary)]/15 text-[var(--rd-color-primary)] flex items-center justify-center mx-auto">
          <Film className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--rd-color-primary)] font-bold">
            404 • Signal Not Found
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Title Unavailable</h1>
          <p className="text-sm text-[var(--rd-color-on-surface-variant)] leading-relaxed">
            The requested movie, series, or page doesn&apos;t exist in our catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            <span>Browse Home</span>
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/50 font-semibold text-sm hover:bg-[var(--rd-color-surface-container-highest)] transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Search Catalog</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
