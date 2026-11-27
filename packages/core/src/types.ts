export interface ApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  popularity: number;
  release_date: string;
  video?: boolean;
  vote_average: number;
  vote_count: number;
  adult?: boolean;
  original_language?: string;
  media_type?: 'movie';
}

export interface TMDBTvShow {
  id: number;
  name: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  popularity: number;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  adult?: boolean;
  original_language?: string;
  origin_country?: string[];
  media_type?: 'tv';
}

export type TMDBMediaItem = TMDBMovie | TMDBTvShow;

export interface TMDBTvSeasonSummary {
  season_number: number;
  name: string;
  episode_count?: number;
}

export interface MediaItem {
  id: number | string;
  title: string;
  name?: string;
  poster_path?: string | null;
  posterUrl: string;
  backdrop_path?: string | null;
  backdropUrl?: string;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  media_type?: 'movie' | 'tv';
  badge?: string;
  servers?: StreamingServerInfo[];
  seasons?: TMDBTvSeasonSummary[];
  external_ids?: {
    imdb_id?: string | null;
  };
}

export interface StreamingServerInfo {
  id: string;
  name: string;
  embedUrl: string;
  quality?: string;
  isRecommended?: boolean;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string | null;
  profileUrl?: string;
}

export interface TMDBVideo {
  id?: string;
  key: string;
  name?: string;
  site: string;
  type: string;
}

export interface TMDBMovieDetails extends TMDBMovie {
  tagline?: string | null;
  genres: TMDBGenre[];
  runtime?: number | null;
  budget?: number;
  revenue?: number;
  status?: string;
  imdb_id?: string | null;
  credits?: {
    cast: CastMember[];
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
    }>;
  };
  videos?: {
    results?: TMDBVideo[];
  };
  servers?: StreamingServerInfo[];
}

export interface TMDBTvDetails extends TMDBTvShow {
  tagline?: string | null;
  genres: TMDBGenre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  credits?: {
    cast: CastMember[];
    crew?: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
    }>;
  };
  videos?: {
    results?: TMDBVideo[];
  };
  servers?: StreamingServerInfo[];
  seasons?: TMDBTvSeasonSummary[];
  external_ids?: {
    imdb_id?: string | null;
  };
}

export interface MediaCardModel {
  id: number;
  type: 'movie' | 'tv' | 'anime';
  title: string;
  meta: string;
  badge?: string;
  format?: string;
  isPrimaryBadge?: boolean;
  imageUrl: string;
  backdropUrl?: string;
  rank?: number;
  progress?: number;
  episodeInfo?: string;
  resumeSeason?: number | null;
  resumeEpisode?: number | null;
  genreIds?: number[];
  rating?: number;
  overview?: string;
  year?: string;
  trailerKey?: string;
  trailerUrl?: string;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path?: string | null;
  stillUrl?: string;
  air_date?: string;
  runtime?: number;
  servers?: StreamingServerInfo[];
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  episodes?: Episode[];
}
