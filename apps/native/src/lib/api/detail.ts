import type { MediaCardModel, TMDBGenre, StreamingServerInfo } from '@netwatch/core';
import { resolveNetwatchBaseUrl } from '../config';

export interface PreviewCastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string;
}

export interface PreviewDetailData {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  overview: string;
  backdropUrl: string;
  posterUrl: string;
  rating: number;
  year: string;
  runtime?: number;
  tagline?: string;
  genres: TMDBGenre[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  cast?: PreviewCastMember[];
  servers?: StreamingServerInfo[];
  trailerKey?: string;
}

export interface SeasonEpisodeItem {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  stillUrl?: string;
  runtime?: number;
  air_date?: string;
}

export async function fetchPreviewDetails(
  type: 'movie' | 'tv',
  id: number
): Promise<PreviewDetailData> {
  const base = await resolveNetwatchBaseUrl();
  const res = await fetch(`${base}/api/preview/${type}/${id}`);
  const json = (await res.json()) as {
    success?: boolean;
    data?: PreviewDetailData;
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || `Failed to load ${type} details (${res.status})`);
  }
  return json.data;
}

export async function fetchTvSeasonEpisodes(
  tvId: number,
  seasonNumber: number
): Promise<SeasonEpisodeItem[]> {
  const base = await resolveNetwatchBaseUrl();
  const res = await fetch(`${base}/api/tv/${tvId}/season/${seasonNumber}`);
  const json = (await res.json()) as {
    success?: boolean;
    data?: { episodes?: SeasonEpisodeItem[] };
    error?: string;
  };
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to load season ${seasonNumber}`);
  }
  return Array.isArray(json.data?.episodes) ? json.data.episodes : [];
}

export async function fetchRecommendationsForDetail(
  type: 'movie' | 'tv',
  genreId?: number
): Promise<MediaCardModel[]> {
  const base = await resolveNetwatchBaseUrl();
  const params = new URLSearchParams({ type, page: '1' });
  if (genreId && genreId > 0) {
    params.set('genreId', String(genreId));
  }
  const res = await fetch(`${base}/api/discover?${params.toString()}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { success?: boolean; data?: MediaCardModel[] };
  return Array.isArray(json.data) ? json.data : [];
}
