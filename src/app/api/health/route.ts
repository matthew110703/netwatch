import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = (process.env.BRAINDANCE_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  let upstreamStatus: 'connected' | 'degraded' | 'unreachable' = 'unreachable';
  let statusCode = 0;

  try {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    statusCode = res.status;
    upstreamStatus = res.ok ? 'connected' : 'degraded';
  } catch {
    upstreamStatus = 'unreachable';
  } finally {
    clearTimeout(timeoutId);
  }

  const latencyMs = Date.now() - startedAt;
  const healthy = upstreamStatus === 'connected';
  const httpStatus = healthy ? 200 : 503;

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      service: 'netwatch',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      upstream: {
        braindance: {
          status: upstreamStatus,
          statusCode,
          latencyMs,
        },
      },
    },
    {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
