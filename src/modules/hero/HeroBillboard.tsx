'use client';

import React from 'react';
import Link from 'next/link';
import { MediaItem } from '@/lib/types';

export interface HeroBillboardProps {
  item: MediaItem;
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({ item }) => {
  const watchHref = `/watch/${item.media_type || 'movie'}/${item.id}`;
  const year = item.release_date ? new Date(item.release_date).getFullYear() : '2024';

  return (
    <header className="relative w-full h-[620px] md:h-[780px] flex items-end">
      {/* Background with cinematic gradients */}
      <div className="absolute inset-0 z-0">
        <img
          src={item.backdropUrl || item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--rd-color-background,#131313)] via-[var(--rd-color-background,#131313)]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--rd-color-background,#131313)]/80 via-transparent to-transparent" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 w-full px-6 md:px-12 pb-16 md:pb-24 max-w-[1440px] mx-auto">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[var(--rd-color-on-surface,#e5e2e1)] tracking-tight max-w-3xl mb-3 drop-shadow-lg">
          {item.title}
        </h1>

        {/* Metadata badges matching Stitch */}
        <div className="flex items-center gap-2.5 mb-3 text-xs text-[var(--rd-color-on-surface-variant,#c2c6d7)] font-medium">
          <span className="text-[var(--rd-color-on-surface,#e5e2e1)] border border-white/30 px-2 py-0.5 rounded text-[10px] font-bold">18+</span>
          <span>{year}</span>
          <span>•</span>
          <span>Sci-Fi / Thriller</span>
          <span>•</span>
          <span className="text-[var(--rd-color-primary,#b0c6ff)] border border-[var(--rd-color-primary,#b0c6ff)]/30 px-2 py-0.5 rounded text-[10px] font-bold">4K HDR</span>
          {item.vote_average > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-300 font-bold">★ {item.vote_average.toFixed(1)}</span>
            </>
          )}
        </div>

        {/* Overview text */}
        <p className="text-sm md:text-base text-[var(--rd-color-on-surface-variant,#c2c6d7)] max-w-xl mb-6 line-clamp-3 leading-relaxed hidden md:block">
          {item.overview}
        </p>

        {/* Action Buttons matching Stitch */}
        <div className="flex items-center gap-4">
          <Link
            href={watchHref}
            className="bg-[var(--rd-color-primary,#b0c6ff)] text-[var(--rd-color-on-primary,#002d6e)] font-semibold text-sm py-2.5 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all shadow-md hover:scale-105 active:scale-95 duration-200"
          >
            <span className="text-lg">▶</span>
            <span>Play</span>
          </Link>
          <Link
            href={watchHref}
            className="bg-white/10 backdrop-blur-md text-[var(--rd-color-on-surface,#e5e2e1)] text-sm py-2.5 px-6 rounded-lg flex items-center gap-2 hover:bg-white/20 transition-colors border border-white/10"
          >
            <span className="text-base">ℹ</span>
            <span>More Info</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
