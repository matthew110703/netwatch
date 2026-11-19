import { apiFetch } from './client';
import { TMDBGenre } from '../types';

export interface GenreListResponse {
  genres: TMDBGenre[];
}

export interface AllGenresResponse {
  movie: TMDBGenre[];
  tv: TMDBGenre[];
}

export const genresApi = {
  /**
   * Get all official movie genres
   */
  async getMovieGenres(language?: string): Promise<TMDBGenre[]> {
    const res = await apiFetch<GenreListResponse>('/genres/movies', {
      params: language ? { language } : undefined,
    });
    return res.genres || [];
  },

  /**
   * Get all official TV genres
   */
  async getTvGenres(language?: string): Promise<TMDBGenre[]> {
    const res = await apiFetch<GenreListResponse>('/genres/tv', {
      params: language ? { language } : undefined,
    });
    return res.genres || [];
  },

  /**
   * Get consolidated movie and TV genres
   */
  async getAllGenres(language?: string): Promise<AllGenresResponse> {
    return apiFetch<AllGenresResponse>('/genres', {
      params: language ? { language } : undefined,
    });
  },
};
