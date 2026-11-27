import type { MediaCardModel, TMDBGenre } from '@netwatch/core';
import { resolveNetwatchBaseUrl } from '../config';

export type TvFeed = {
  spotlightTv: MediaCardModel | null;
  popularTv: MediaCardModel[];
  topRatedTv: MediaCardModel[];
  onTheAirTv: MediaCardModel[];
  genres?: TMDBGenre[];
};

export async function fetchTvFeed(): Promise<TvFeed> {
  const base = await resolveNetwatchBaseUrl();
  const res = await fetch(`${base}/api/tv`);
  const json = (await res.json()) as { success?: boolean; data?: TvFeed; error?: string };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || `TV feed failed (${res.status})`);
  }
  return json.data;
}
