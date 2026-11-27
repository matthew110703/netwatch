import type { MediaCardModel } from '@netwatch/core';
import { resolveNetwatchBaseUrl } from '../config';

export type DiscoverResponse = {
  success: boolean;
  data?: MediaCardModel[];
  page?: number;
  totalPages?: number;
};

export async function fetchDiscoverByGenre(
  type: 'movie' | 'tv' | 'all',
  genreId: number,
  page = 1,
  signal?: AbortSignal
): Promise<MediaCardModel[]> {
  const base = await resolveNetwatchBaseUrl();
  const params = new URLSearchParams({
    type,
    page: String(page),
  });
  if (genreId > 0) {
    params.set('genreId', String(genreId));
  }
  const res = await fetch(`${base}/api/discover?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Discover failed (${res.status})`);
  }
  const json = (await res.json()) as DiscoverResponse;
  if (!json.success || !json.data) {
    throw new Error('Discover returned no data');
  }
  return json.data;
}

export function fetchDiscoverMovies(page = 1): Promise<MediaCardModel[]> {
  return fetchDiscoverByGenre('movie', 0, page);
}

export function fetchDiscoverTv(page = 1): Promise<MediaCardModel[]> {
  return fetchDiscoverByGenre('tv', 0, page);
}
