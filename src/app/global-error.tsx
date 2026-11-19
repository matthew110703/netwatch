'use client';

import React, { useEffect } from 'react';

function extractDigest(error: unknown): string | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string'
  ) {
    return (error as { digest: string }).digest;
  }
  return undefined;
}

export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('[Netwatch Global Error Boundary]', error);
  }, [error]);

  const digest = extractDigest(error);
  const handleRetry = retry ?? reset;

  return (
    <html lang="en">
      <head>
        <title>Unexpected Error | Netwatch</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            padding: '32px',
            borderRadius: '18px',
            backgroundColor: '#111827',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#60a5fa',
            }}
          >
            Netwatch Recovery
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: 800 }}>
            Something went wrong
          </h1>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#cbd5e1',
            }}
          >
            An unexpected application error occurred. You can retry rendering or return to the home catalog.
          </p>
          {digest && (
            <p
              style={{
                margin: '0 0 20px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#94a3b8',
              }}
            >
              Reference ID: {digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {handleRetry && (
              <button
                type="button"
                onClick={() => handleRetry()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Back Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
