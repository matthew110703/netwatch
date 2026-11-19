'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

function extractErrorDetails(error: unknown): { message?: string; digest?: string } {
  const digest =
    error &&
    typeof error === 'object' &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string'
      ? (error as { digest: string }).digest
      : undefined;

  const message = error instanceof Error ? error.message : undefined;
  return { message, digest };
}

export default function GlobalRouteError({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('[Netwatch Error Boundary]', error);
  }, [error]);

  const { digest } = extractErrorDetails(error);
  const handleRetry = retry ?? reset;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-[var(--rd-color-surface)] text-[var(--rd-color-on-surface)]">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[var(--rd-color-surface-container)] border border-[var(--rd-color-outline-variant)]/40 shadow-xl space-y-5">
        <div className="w-14 h-14 rounded-full bg-[var(--rd-color-error-container)] text-[var(--rd-color-on-error-container)] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-[var(--rd-color-on-surface-variant)] leading-relaxed">
            We couldn&apos;t complete this request right now. Please try again or return to the catalog.
          </p>
          {digest && (
            <p className="text-[11px] font-mono text-[var(--rd-color-outline)] pt-1">
              Error ID: {digest}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {handleRetry && (
            <button
              type="button"
              onClick={() => handleRetry()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--rd-color-surface-container-high)] text-[var(--rd-color-on-surface)] border border-[var(--rd-color-outline-variant)]/50 font-semibold text-sm hover:bg-[var(--rd-color-surface-container-highest)] transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
