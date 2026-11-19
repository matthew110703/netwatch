'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, Tv, Bookmark, Search } from 'lucide-react';
import { useWatchlist } from '@/context/WatchlistContext';

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();
  const { count } = useWatchlist();

  if (pathname === '/watch' || pathname?.startsWith('/watch/')) {
    return null;
  }

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-netwatch-search'));
  };

  const items = [
    { label: 'Home', href: '/', icon: Home, isSearch: false },
    { label: 'Movies', href: '/movies', icon: Film, isSearch: false },
    { label: 'TV', href: '/tv', icon: Tv, isSearch: false },
    { label: 'My List', href: '/watchlist', icon: Bookmark, isSearch: false, badge: count },
    { label: 'Search', href: '/search', icon: Search, isSearch: true },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--rd-color-surface-container-lowest)]/95 backdrop-blur-xl border-t border-[var(--rd-color-outline-variant)]/35 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around items-center shadow-[0_-8px_24px_rgba(0,0,0,0.12)] text-[var(--rd-color-on-surface)]"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={item.isSearch ? handleSearchClick : undefined}
            className={`relative min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus)] ${
              isActive
                ? 'text-[var(--rd-color-primary)] font-bold'
                : 'text-[var(--rd-color-on-surface-variant)] hover:text-[var(--rd-color-on-surface)]'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] text-[9px] font-bold flex items-center justify-center leading-none">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
