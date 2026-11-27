import type { MediaCardModel } from '@netwatch/core';
import { resolveNetwatchBaseUrl } from '../config';

export type SearchCategory = 'all' | 'movie' | 'tv';

export interface SearchApiResponse {
  success: boolean;
  data: MediaCardModel[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export async function fetchSearchResults(
  query: string,
  category: SearchCategory = 'all',
  page = 1,
  signal?: AbortSignal
): Promise<SearchApiResponse> {
  const q = query.trim();
  if (!q) {
    return {
      success: true,
      data: [],
      page: 1,
      totalPages: 1,
      totalResults: 0,
    };
  }
  const base = await resolveNetwatchBaseUrl();
  const params = new URLSearchParams({
    q,
    type: category,
    page: String(page),
  });
  const res = await fetch(`${base}/api/search?${params.toString()}`, { signal });
  const json = (await res.json()) as Partial<SearchApiResponse>;
  if (!res.ok) {
    throw new Error(`Search failed (${res.status})`);
  }
  const data = Array.isArray(json.data) ? json.data : [];
  return {
    success: true,
    data,
    page: typeof json.page === 'number' ? json.page : page,
    totalPages: typeof json.totalPages === 'number' ? json.totalPages : 1,
    totalResults: typeof json.totalResults === 'number' ? json.totalResults : data.length,
  };
}
