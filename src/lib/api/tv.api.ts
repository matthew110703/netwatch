import { apiFetch } from './client';
import { TMDBTvShow, TMDBTvDetails, TMDBPaginatedResponse, Episode, Season } from '../types';

export interface TvListQuery {
  page?: number;
  language?: string;
}

export const tvApi = {
  /**
   * Get TV shows airing today
   */
  async getAiringToday(query?: TvListQuery): Promise<TMDBPaginatedResponse<TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBTvShow>>('/tv/airing-today', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get TV shows currently on the air
   */
  async getOnTheAir(query?: TvListQuery): Promise<TMDBPaginatedResponse<TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBTvShow>>('/tv/on-the-air', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get popular TV shows
   */
  async getPopular(query?: TvListQuery): Promise<TMDBPaginatedResponse<TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBTvShow>>('/tv/popular', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get top rated TV shows
   */
  async getTopRated(query?: TvListQuery): Promise<TMDBPaginatedResponse<TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBTvShow>>('/tv/top-rated', {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get TV show details by ID, including credits and streaming servers
   */
  async getTvDetails(
    id: number,
    query?: { language?: string; append_to_response?: string }
  ): Promise<TMDBTvDetails> {
    return apiFetch<TMDBTvDetails>(`/tv/${id}`, {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get TV show recommendations by ID
   */
  async getRecommendations(id: number, query?: TvListQuery): Promise<TMDBPaginatedResponse<TMDBTvShow>> {
    return apiFetch<TMDBPaginatedResponse<TMDBTvShow>>(`/tv/${id}/recommendations`, {
      params: query as Record<string, string | number | boolean | undefined>,
    });
  },

  /**
   * Get TV Season details
   */
  async getSeasonDetails(tvId: number, seasonNumber: number): Promise<Season> {
    return apiFetch<Season>(`/tv/${tvId}/season/${seasonNumber}`);
  },

  /**
   * Get TV Episode details
   */
  async getEpisodeDetails(tvId: number, seasonNumber: number, episodeNumber: number): Promise<Episode> {
    return apiFetch<Episode>(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`);
  },
};
