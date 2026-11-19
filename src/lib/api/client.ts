import { ApiResponse } from '../types';

const BRAINDANCE_BASE_URL =
  process.env.BRAINDANCE_API_URL || 'http://localhost:8001';
const API_VERSION_PREFIX = '/api/v1';
const BRAINDANCE_API_KEY =
  process.env.BRAINDANCE_API_KEY || 'bd_live_dev_secret_key_2026';

let warnedMissingProductionKey = false;

export class ApiClientError extends Error {
  statusCode: number;
  endpoint: string;
  details?: unknown;

  constructor(statusCode: number, message: string, endpoint: string, details?: unknown) {
    super(`[Braindance API] ${statusCode} on ${endpoint}: ${message}`);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
  deviceId?: string;
  clientIp?: string;
  noStore?: boolean;
}

const VALID_DEVICE_ID = /^[a-zA-Z0-9_-]{4,128}$/;

async function resolveIncomingClientContext(
  explicitDeviceId?: string,
  explicitClientIp?: string
): Promise<{
  deviceId: string;
  clientIp?: string;
  forwardedFor?: string;
}> {
  let deviceId = explicitDeviceId || 'netwatch_web_client';
  if (typeof window !== 'undefined') {
    return { deviceId, clientIp: explicitClientIp };
  }

  try {
    const { headers } = await import('next/headers');
    const hdrs = await headers();
    const xff = hdrs.get('x-forwarded-for')?.trim();
    const firstForwardedIp = xff ? xff.split(',')[0]?.trim() : undefined;
    const resolvedIp =
      explicitClientIp ||
      hdrs.get('cf-connecting-ip')?.trim() ||
      hdrs.get('true-client-ip')?.trim() ||
      hdrs.get('x-real-ip')?.trim() ||
      hdrs.get('x-client-ip')?.trim() ||
      firstForwardedIp ||
      undefined;

    if (!explicitDeviceId) {
      const headerDevId = hdrs.get('x-device-id')?.trim();
      if (headerDevId && VALID_DEVICE_ID.test(headerDevId)) {
        deviceId = headerDevId;
      } else {
        const cookieHeader = hdrs.get('cookie') || '';
        const match = cookieHeader.match(/(?:^|;\s*)netwatch_device_id=([^;]+)/);
        if (match?.[1]) {
          const decoded = decodeURIComponent(match[1]).trim();
          if (VALID_DEVICE_ID.test(decoded)) {
            deviceId = decoded;
          }
        }
      }
    }

    return {
      deviceId,
      clientIp: resolvedIp,
      forwardedFor: xff || resolvedIp,
    };
  } catch {
    return { deviceId, clientIp: explicitClientIp };
  }
}

/**
 * Core HTTP client wrapper for Braindance API
 * Injects secret headers, enforces version prefix, handles timeouts and deserializes ApiResponse
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.BRAINDANCE_API_KEY &&
    !warnedMissingProductionKey
  ) {
    warnedMissingProductionKey = true;
    console.warn(
      '[Braindance API] BRAINDANCE_API_KEY is unset in production; using fallback dev key.'
    );
  }
  const {
    timeoutMs = 8000,
    params,
    deviceId: explicitDeviceId,
    clientIp: explicitClientIp,
    noStore = false,
    ...fetchOptions
  } = options;

  const { deviceId, clientIp, forwardedFor } = await resolveIncomingClientContext(
    explicitDeviceId,
    explicitClientIp
  );

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const bypassCache = noStore || method !== 'GET';

  // Build full URL with query parameters
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${BRAINDANCE_BASE_URL}${API_VERSION_PREFIX}${normalizedEndpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Setup abort controller for timeout safety
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BRAINDANCE_API_KEY,
        'x-device-id': deviceId,
        ...(clientIp ? { 'x-client-ip': clientIp } : {}),
        ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
        ...fetchOptions.headers,
      },
      signal: controller.signal,
      ...(bypassCache
        ? { cache: 'no-store' as const }
        : { next: { revalidate: 120 } }),
    });

    if (!res.ok) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = await res.text();
      }
      throw new ApiClientError(res.status, res.statusText, endpoint, errorBody);
    }

    const json = (await res.json()) as ApiResponse<T>;
    if (json.success === false) {
      throw new ApiClientError(json.statusCode || 500, json.message || 'API error', endpoint, json);
    }
    return json.data;
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    const err = error as Error;
    throw new ApiClientError(
      err.name === 'AbortError' ? 408 : 500,
      err.message || 'Unknown network error',
      endpoint
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Wrapper that executes an API request with an automatic graceful fallback
 * Returns `{ data, isLive }` where `isLive` indicates if real Braindance data was retrieved.
 */
export async function withFallback<T>(
  requestPromise: Promise<T>,
  fallbackValue: T
): Promise<{ data: T; isLive: boolean }> {
  try {
    const data = await requestPromise;
    return { data, isLive: true };
  } catch (error) {
    console.warn(`[Braindance API] Request failed, using fallback vault data:`, error);
    return { data: fallbackValue, isLive: false };
  }
}
