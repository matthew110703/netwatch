import type { MediaCardModel, TMDBGenre } from '@netwatch/core';
import { resolveNetwatchBaseUrl } from '../config';

export type LanguageRail = {
  code: string;
  label: string;
  title: string;
  subtitle: string;
  items: MediaCardModel[];
};

export type HomeFeed = {
  billboardItem: MediaCardModel | null;
  trendingItems: MediaCardModel[];
  topPicksItems: MediaCardModel[];
  popularTvItems: MediaCardModel[];
  topRatedItems: MediaCardModel[];
  region: string;
  regionLabel: string;
  regionTopMovies: MediaCardModel[];
  regionTopTv: MediaCardModel[];
  languageRails: LanguageRail[];
  genres?: TMDBGenre[];
  isLive?: boolean;
};

type HomeResponse = {
  success: boolean;
  data?: HomeFeed;
  error?: string;
};

export async function fetchHomeFeed(region = 'US'): Promise<HomeFeed> {
  const base = await resolveNetwatchBaseUrl();
  const res = await fetch(`${base}/api/home?region=${encodeURIComponent(region)}`);
  const json = (await res.json()) as HomeResponse;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || `Home feed failed (${res.status})`);
  }
  return json.data;
}
