'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CastMember } from '@/lib/types';

export interface CastSectionProps {
  cast?: CastMember[];
  variant?: 'compact' | 'detail';
}

export const CastSection: React.FC<CastSectionProps> = ({
  cast = [],
  variant = 'compact',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState, cast]);

  if (cast.length === 0) return null;

  const isDetail = variant === 'detail';

  const scrollTrack = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = Math.max(200, Math.round(el.clientWidth * 0.75));
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !scrollRef.current) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.clientX,
      scrollLeft: scrollRef.current.scrollLeft,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDown || !scrollRef.current) return;
    const delta = e.clientX - dragStateRef.current.startX;
    scrollRef.current.scrollLeft = dragStateRef.current.scrollLeft - delta;
  };

  const handlePointerUp = () => {
    dragStateRef.current.isDown = false;
  };

  return (
    <section className="w-full min-w-0 space-y-4">
      <div className="flex w-full items-center justify-between gap-3">
        <h2
          className={
            isDetail
              ? 'text-xl sm:text-2xl font-bold text-[var(--rd-color-on-surface)]'
              : 'text-lg font-bold text-[var(--rd-color-on-surface)]'
          }
        >
          Cast &amp; Crew
        </h2>

        {(canScrollLeft || canScrollRight) && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollTrack('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll Cast & Crew left"
              className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-[var(--rd-color-surface-container-high)] hover:bg-[var(--rd-color-surface-container-highest)] disabled:opacity-35 disabled:cursor-default text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 transition-colors cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTrack('right')}
              disabled={!canScrollRight}
              aria-label="Scroll Cast & Crew right"
              className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-[var(--rd-color-surface-container-high)] hover:bg-[var(--rd-color-surface-container-highest)] disabled:opacity-35 disabled:cursor-default text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/40 transition-colors cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-color-focus)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex w-full gap-5 overflow-x-auto px-1 pb-3 scroll-smooth select-none cursor-grab active:cursor-grabbing no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {cast.map((member) => (
          <div
            key={member.id}
            className={`flex flex-col items-center gap-2 shrink-0 group text-center ${
              isDetail ? 'w-[104px]' : 'w-[88px] sm:w-[96px]'
            }`}
          >
            <div
              className={`${
                isDetail ? 'w-20 h-20 border-2 shadow-md' : 'w-16 h-16 sm:w-18 sm:h-18 border'
              } rounded-full overflow-hidden bg-[var(--rd-color-surface-container-high)] border-[var(--rd-color-outline-variant)]/40 group-hover:border-[var(--rd-color-primary)] transition-all duration-300 flex items-center justify-center`}
            >
              {member.profileUrl ? (
                <img
                  src={member.profileUrl}
                  alt={member.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 pointer-events-none"
                />
              ) : (
                <span
                  className={`${
                    isDetail ? 'text-sm' : 'text-xs'
                  } font-bold text-[var(--rd-color-on-surface-variant)]`}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className={isDetail ? 'w-full max-w-[104px]' : 'w-full max-w-[96px]'}>
              <p
                className={`${
                  isDetail ? 'text-xs sm:text-sm' : 'text-xs'
                } font-semibold text-[var(--rd-color-on-surface)] truncate`}
              >
                {member.name}
              </p>
              {member.character && (
                <p className="text-[11px] text-[var(--rd-color-on-surface-variant)] truncate">
                  {member.character}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
