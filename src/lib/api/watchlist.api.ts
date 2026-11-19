import { apiFetch } from './client';
import { TMDBMovieDetails, TMDBTvDetails } from '../types';

export type WatchlistHydratedItem = (TMDBMovieDetails | TMDBTvDetails) & {
  media_type?: 'movie' | 'tv';
};

export interface WatchlistResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: WatchlistHydratedItem[];
}

export interface WatchlistActionResponse {
  success: boolean;
  message: string;
  media_id: number;
  media_type?: 'movie' | 'tv';
  count: number;
}

export const watchlistApi = {
  /**
   * Get device watchlist
   */
  async getWatchlist(deviceId?: string): Promise<WatchlistResponse> {
    return apiFetch<WatchlistResponse>('/watchlist', { deviceId, noStore: true });
  },

  /**
   * Add media to watchlist
   */
  async addToWatchlist(
    mediaId: number,
    mediaType: 'movie' | 'tv' = 'movie',
    deviceId?: string
  ): Promise<WatchlistActionResponse> {
    return apiFetch<WatchlistActionResponse>('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ media_id: mediaId, media_type: mediaType }),
      deviceId,
      noStore: true,
    });
  },

  /**
   * Check if a media item is saved in device watchlist
   */
  async checkStatus(
    mediaId: number,
    mediaType?: 'movie' | 'tv',
    deviceId?: string
  ): Promise<{ item_present: boolean; media_id: number }> {
    return apiFetch<{ item_present: boolean; media_id: number }>(
      `/watchlist/status/${mediaId}`,
      {
        deviceId,
        noStore: true,
        params: mediaType ? { media_type: mediaType } : undefined,
      }
    );
  },

  /**
   * Remove media from watchlist
   */
  async removeFromWatchlist(
    mediaId: number,
    mediaType?: 'movie' | 'tv',
    deviceId?: string
  ): Promise<WatchlistActionResponse> {
    return apiFetch<WatchlistActionResponse>(`/watchlist/${mediaId}`, {
      method: 'DELETE',
      deviceId,
      noStore: true,
      params: mediaType ? { media_type: mediaType } : undefined,
    });
  },
};
