import { apiFetch } from './client';
import { TMDBMovie, TMDBMovieDetails, TMDBPaginatedResponse } from '../types';

export interface MovieListQuery {
  page?: number;
  language?: string;
  region?: string;
}

export const moviesApi = {
  /**
   * Get movies currently in theatres
   */
  async getNowPlaying(query?: MovieListQuery): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie>>('/movies/now-playing', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get movies ordered by popularity
   */
  async getPopular(query?: MovieListQuery): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie>>('/movies/popular', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get movies ordered by top rating
   */
  async getTopRated(query?: MovieListQuery): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie>>('/movies/top-rated', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get upcoming movies
   */
  async getUpcoming(query?: MovieListQuery): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie>>('/movies/upcoming', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get full movie details by ID, including credits and available streaming servers
   */
  async getMovieDetails(
    id: number,
    query?: { language?: string; append_to_response?: string }
  ): Promise<TMDBMovieDetails> {
    return apiFetch<TMDBMovieDetails>(`/movies/${id}`, {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get recommended movies based on movie ID
   */
  async getRecommendations(id: number, query?: MovieListQuery): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return apiFetch<TMDBPaginatedResponse<TMDBMovie>>(`/movies/${id}/recommendations`, {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },
};
