import { apiFetch } from './client';

export type PlaybackEvent = 'timeupdate' | 'play' | 'pause' | 'ended' | 'seeked';

export interface PlaybackProgress {
  event: PlaybackEvent;
  currentTime: number;
  duration: number;
  progress: number;
  season?: number | null;
  episode?: number | null;
  timestamp: number;
}

export interface HistoryItem {
  id: number;
  media_type?: 'movie' | 'tv';
  progress: PlaybackProgress;
  updatedAt?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  genre_ids?: number[];
  [key: string]: unknown;
}

export interface HistoryListResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: HistoryItem[];
}

export interface HistoryStatusResponse {
  media_id: number;
  item_present: boolean;
  data?: HistoryItem | null;
}

export const historyApi = {
  async getHistory(
    query?: { page?: number; limit?: number; mediaType?: 'movie' | 'tv' },
    deviceId?: string
  ): Promise<HistoryListResponse> {
    return apiFetch<HistoryListResponse>('/history', {
      params: query as Record<string, string | number | boolean | undefined>,
      deviceId,
      noStore: true,
    });
  },

  async getContinueWatching(
    query?: { limit?: number; mediaType?: 'movie' | 'tv' },
    deviceId?: string
  ): Promise<HistoryListResponse> {
    return apiFetch<HistoryListResponse>('/history/continue-watching', {
      params: query as Record<string, string | number | boolean | undefined>,
      deviceId,
      noStore: true,
    });
  },

  async getProgress(
    mediaId: number,
    deviceId?: string,
    query?: { mediaType?: 'movie' | 'tv'; season?: number; episode?: number }
  ): Promise<HistoryStatusResponse> {
    return apiFetch<HistoryStatusResponse>(`/history/${mediaId}`, {
      params: query as Record<string, string | number | boolean | undefined>,
      deviceId,
      noStore: true,
    });
  },

  async updateProgress(
    mediaId: number,
    body: {
      event: PlaybackEvent;
      currentTime: number;
      duration: number;
      progress: number;
      mediaType?: 'movie' | 'tv';
      season?: number | null;
      episode?: number | null;
      id?: string | number;
    },
    deviceId?: string
  ): Promise<HistoryItem> {
    return apiFetch<HistoryItem>(`/history/${mediaId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      deviceId,
      noStore: true,
    });
  },

  async removeHistoryItem(
    mediaId: number,
    mediaType?: 'movie' | 'tv',
    deviceId?: string
  ): Promise<{ media_id?: number }> {
    return apiFetch<{ media_id?: number }>(`/history/${mediaId}`, {
      method: 'DELETE',
      params: mediaType ? { mediaType } : undefined,
      deviceId,
      noStore: true,
    });
  },

  async clearHistory(deviceId?: string): Promise<null> {
    return apiFetch<null>('/history', {
      method: 'DELETE',
      deviceId,
      noStore: true,
    });
  },
};
