import { apiFetch } from './client';
import { TMDBMovie, TMDBTvShow, TMDBPaginatedResponse } from '../types';

export type TimeWindow = 'day' | 'week';

export interface TrendingQuery {
  page?: number;
  language?: string;
}

export const trendingApi = {
  /**
   * Get trending items across all media types (Movies, TV)
   */
  async getTrendingAll(timeWindow: TimeWindow = 'day', query?: TrendingQuery): Promise<TMDBPaginatedResponse<TMDBMovie | TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie | TMDBTvShow>>(`/trending/all/${timeWindow}`, {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get trending movies
   */
  async getTrendingMovies(timeWindow: TimeWindow = 'day', query?: TrendingQuery): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie>>(`/trending/movies/${timeWindow}`, {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get trending TV series
   */
  async getTrendingTv(timeWindow: TimeWindow = 'day', query?: TrendingQuery): Promise<TMDBPaginatedResponse<TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBTvShow>>(`/trending/tv/${timeWindow}`, {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },
};
