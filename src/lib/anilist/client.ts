import { unstable_cache } from 'next/cache';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

export const ANILIST_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
} as const;

export class AniListRateLimitError extends Error {
  retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super(`AniList rate limit (retry after ${retryAfterSec}s)`);
    this.name = 'AniListRateLimitError';
    this.retryAfterSec = retryAfterSec;
  }
}

let lastStalePayload: { key: string; data: unknown } | null = null;

async function postAniList<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables });

  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  });

  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null && Number(remaining) < 5) {
    console.warn('[AniList] Rate limit remaining low:', remaining);
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') ?? 60);
    if (lastStalePayload?.key === cacheKey) {
      return lastStalePayload.data as T;
    }
    throw new AniListRateLimitError(retryAfter);
  }

  if (!res.ok) {
    throw new Error(`AniList HTTP ${res.status}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'AniList GraphQL error');
  }
  if (!json.data) {
    throw new Error('AniList returned empty data');
  }

  lastStalePayload = { key: cacheKey, data: json.data };
  return json.data;
}

export function createAniListQuery<T>(
  cacheKeyParts: string[],
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const cached = unstable_cache(
    async () => postAniList<T>(query, variables),
    cacheKeyParts,
    { revalidate: 300 }
  );
  return cached();
}