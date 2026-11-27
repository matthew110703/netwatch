'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

const WARMUP_MS = 60_000;
const POLL_MS = 2_500;

function CatalogSkeleton({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)] pb-16">
      <div className="w-full aspect-[21/9] max-h-[70vh] bg-[var(--rd-color-surface-container-high)] animate-pulse" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 mt-10 space-y-8">
        <div className="flex items-center gap-3 text-[var(--rd-color-on-surface-variant)]">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--rd-color-primary)]" />
          <p className="text-sm font-medium">{label}</p>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="shrink-0 w-40 sm:w-48 aspect-[2/3] rounded-xl bg-[var(--rd-color-surface-container-high)] animate-pulse"
            />
          ))}
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={`b-${n}`}
              className="shrink-0 w-56 aspect-video rounded-xl bg-[var(--rd-color-surface-container-high)] animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CatalogColdStartProps<T> {
  initial: T;
  hasContent: (data: T) => boolean;
  apiPath: string;
  apiQuery?: string;
  loadingLabel?: string;
  children: (data: T) => React.ReactNode;
}

export function CatalogColdStart<T>({
  initial,
  hasContent,
  apiPath,
  apiQuery,
  loadingLabel = 'Waking catalog uplink…',
  children,
}: CatalogColdStartProps<T>) {
  const [data, setData] = useState(initial);
  const [warming, setWarming] = useState(!hasContent(initial));
  const polledRef = useRef(false);

  useEffect(() => {
    setData(initial);
    if (hasContent(initial)) {
      setWarming(false);
    }
  }, [initial, hasContent]);

  useEffect(() => {
    if (hasContent(initial)) {
      setWarming(false);
      return;
    }
    if (polledRef.current) return;
    polledRef.current = true;

    let cancelled = false;
    const started = Date.now();

    const poll = async () => {
      while (!cancelled && Date.now() - started < WARMUP_MS) {
        try {
          const url = apiQuery ? `${apiPath}?${apiQuery}` : apiPath;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            const json = (await res.json()) as { success?: boolean; data?: T };
            const next = json.data;
            if (next && hasContent(next)) {
              setData(next);
              setWarming(false);
              return;
            }
          }
        } catch {
          // keep polling through Render cold start
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
      if (!cancelled) setWarming(false);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [apiPath, apiQuery, hasContent, initial]);

  if (warming && !hasContent(data)) {
    return <CatalogSkeleton label={loadingLabel} />;
  }

  return <>{children(data)}</>;
}