import { apiFetch } from './client';
import { TMDBMovie, TMDBTvShow, TMDBPaginatedResponse } from '../types';

export interface DiscoverQuery {
  page?: number;
  language?: string;
  with_genres?: string | number;
  sort_by?: string;
}

export const discoverApi = {
  async discoverMovies(query?: DiscoverQuery): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie>>('/discover/movies', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  async discoverTv(query?: DiscoverQuery): Promise<TMDBPaginatedResponse<TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBTvShow>>('/discover/tv', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },
};
