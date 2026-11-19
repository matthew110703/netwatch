import { apiFetch } from './client';
import { TMDBMovie, TMDBTvShow, TMDBPaginatedResponse } from '../types';

export interface SearchQuery {
  query: string;
  page?: number;
  language?: string;
}

export const searchApi = {
  /**
   * Multi-search across movies and TV series
   */
  async searchMulti(params: SearchQuery): Promise<TMDBPaginatedResponse<TMDBMovie | TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie | TMDBTvShow>>('/search/multi', {
      params: {
        query: params.query,
        page: params.page,
        language: params.language,
      },
    });
  },

  /**
   * Search specifically for movies
   */
  async searchMovies(params: SearchQuery): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie>>('/search/movies', {
      params: {
        query: params.query,
        page: params.page,
        language: params.language,
      },
    });
  },

  /**
   * Search specifically for TV shows
   */
  async searchTv(params: SearchQuery): Promise<TMDBPaginatedResponse<TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBTvShow>>('/search/tv', {
      params: {
        query: params.query,
        page: params.page,
        language: params.language,
      },
    });
  },
};
