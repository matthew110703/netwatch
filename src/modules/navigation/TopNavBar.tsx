'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@ripperdoc-chrome77/themes';
import { Search, Sun, Moon, Bookmark } from 'lucide-react';
import { useWatchlist } from '@/context/WatchlistContext';
import { NetwatchLogo } from '@/components/NetwatchLogo';

const emptySubscribe = () => () => {};

export const TopNavBar: React.FC = () => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { count } = useWatchlist();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted ? theme === 'obsidian' : false;

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('open-netwatch-search'));
  };

  const isWatch = pathname === '/watch' || pathname?.startsWith('/watch/');

  const navLinkCls = (active: boolean) =>
    `transition-colors font-medium text-sm rounded-full px-4 py-2 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus,#2563eb)] ${
      active
        ? 'bg-[var(--rd-color-primary-container,#2563eb)] text-[var(--rd-color-on-primary-container,#ffffff)] shadow-sm'
        : 'text-[var(--rd-color-on-surface-variant,#434655)] hover:text-[var(--rd-color-on-surface,#0b1c30)] hover:bg-[var(--rd-color-surface-container-high)]/60'
    }`;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--rd-color-surface-container-lowest)]/85 backdrop-blur-md border-b border-[var(--rd-color-outline-variant)]/30"
    >
      <div className="h-16 w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 flex items-center justify-between gap-3">
        {/* Brand & Navigation */}
        <div className="flex items-center gap-6 sm:gap-8 min-w-0">
          <Link
            className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus)] rounded-lg shrink-0"
            href="/"
            title="Netwatch Streaming"
          >
            <NetwatchLogo size="md" />
          </Link>

          {!isWatch && (
            <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
              <Link href="/" className={navLinkCls(pathname === '/')}>
                Home
              </Link>
              <Link href="/movies" className={navLinkCls(pathname === '/movies')}>
                Movies
              </Link>
              <Link href="/tv" className={navLinkCls(pathname === '/tv')}>
                TV Shows
              </Link>
              <Link href="/anime" className={navLinkCls(pathname === '/anime' || pathname?.startsWith('/anime/'))}>
                Anime
              </Link>
            </nav>
          )}
        </div>

        {/* Action Controls & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/watchlist"
            className={`hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-full border border-[var(--rd-color-outline-variant)]/40 text-sm font-medium transition-colors ${
              pathname === '/watchlist'
                ? 'bg-[var(--rd-color-primary-container)] text-[var(--rd-color-on-primary-container)]'
                : 'text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-high)]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>My List</span>
            {mounted && count > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] leading-none">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={handleOpenSearch}
            aria-label="Search catalog (Press /)"
            title="Search (/ or ⌘K)"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)] hover:bg-[var(--rd-color-surface-container-high)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus)]"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Theme Switcher (Luminous Light & Obsidian Dark) */}
          <div
            className="flex items-center bg-[var(--rd-color-surface-container-low)] p-0.5 rounded-full border border-[var(--rd-color-outline-variant)]/40"
            suppressHydrationWarning
          >
            <button
              aria-label="Switch to light mode"
              aria-pressed={!isDark}
              onClick={() => setTheme('luminous')}
              suppressHydrationWarning
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus)] ${
                !isDark
                  ? 'bg-[var(--rd-color-surface-container-lowest)] text-[var(--rd-color-primary)] shadow-sm'
                  : 'text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)]'
              }`}
              type="button"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              aria-label="Switch to dark mode"
              aria-pressed={isDark}
              onClick={() => setTheme('obsidian')}
              suppressHydrationWarning
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus)] ${
                isDark
                  ? 'bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-primary)] shadow-sm'
                  : 'text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)]'
              }`}
              type="button"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
