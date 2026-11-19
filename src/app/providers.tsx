'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ThemeProvider } from '@ripperdoc-chrome77/themes';
import { FullScreenSearchModal } from '@/modules/search/FullScreenSearchModal';
import { QuickPreviewModal } from '@/modules/preview/QuickPreviewModal';
import { MediaCardModel } from '@/lib/types';
import { WatchlistProvider } from '@/context/WatchlistContext';
import { recordNonWatchRoute } from '@/lib/navigation-history';

function RouteHistoryTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString() || '';
    recordNonWatchRoute(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

export function NetwatchProviders({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaCardModel | null>(null);

  const modalActive = isSearchOpen || !!previewItem;

  // Centralized body scroll lock & background hero playback state across modals
  useEffect(() => {
    if (!modalActive) {
      window.dispatchEvent(new CustomEvent('resume-netwatch-hero'));
      return;
    }

    window.dispatchEvent(new CustomEvent('pause-netwatch-hero'));
    const scrollY = window.scrollY;
    const origBodyPos = document.body.style.position;
    const origBodyTop = document.body.style.top;
    const origBodyWidth = document.body.style.width;
    const origBodyOverflow = document.body.style.overflow;
    const origHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.position = origBodyPos;
      document.body.style.top = origBodyTop;
      document.body.style.width = origBodyWidth;
      document.body.style.overflow = origBodyOverflow;
      document.documentElement.style.overflow = origHtmlOverflow;
      window.scrollTo(0, scrollY);
      window.dispatchEvent(new CustomEvent('resume-netwatch-hero'));
    };
  }, [modalActive]);

  useEffect(() => {
    const handleOpenSearch = () => {
      setIsSearchOpen(true);
    };
    const handleCloseSearch = () => {
      setIsSearchOpen(false);
    };
    const handleOpenPreview = (e: Event) => {
      const customEvent = e as CustomEvent<MediaCardModel>;
      if (customEvent.detail) setPreviewItem(customEvent.detail);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !isSearchOpen) {
        const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          setIsSearchOpen(true);
        }
      }
    };

    window.addEventListener('open-netwatch-search', handleOpenSearch);
    window.addEventListener('close-netwatch-search', handleCloseSearch);
    window.addEventListener('open-netwatch-preview', handleOpenPreview);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-netwatch-search', handleOpenSearch);
      window.removeEventListener('close-netwatch-search', handleCloseSearch);
      window.removeEventListener('open-netwatch-preview', handleOpenPreview);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

  return (
    <ThemeProvider defaultTheme="luminous" applyToRoot storageKey="netwatch-theme">
      <WatchlistProvider>
        <Suspense fallback={null}>
          <RouteHistoryTracker />
        </Suspense>
        {children}
        <FullScreenSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onOpenPreview={(item) => {
            setIsSearchOpen(false);
            setPreviewItem(item);
          }}
        />
        <QuickPreviewModal
          item={previewItem}
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
        />
      </WatchlistProvider>
    </ThemeProvider>
  );
}
