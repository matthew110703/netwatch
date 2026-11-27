import { TMDBMovie, TMDBTvShow, MediaCardModel } from './types';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type ImageSize = 'w300' | 'w500' | 'w780' | 'w1280' | 'original';

export function getTmdbImageUrl(
  path: string | null | undefined,
  size: ImageSize = 'w780',
  fallback: string = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1280&auto=format&fit=crop'
): string {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function mapTmdbMovieToCard(movie: TMDBMovie, rank?: number): MediaCardModel {
  const year = movie.release_date ? movie.release_date.split('-')[0] : '';

  return {
    id: movie.id,
    type: 'movie',
    title: movie.title,
    meta: year ? `Feature Film • ${year}` : 'Feature Film',
    format: '4K HDR',
    imageUrl: getTmdbImageUrl(movie.poster_path, 'w500'),
    backdropUrl: getTmdbImageUrl(movie.backdrop_path, 'w1280'),
    rank,
    genreIds: movie.genre_ids,
    rating: movie.vote_average,
    overview: movie.overview,
    year,
  };
}

export function mapTmdbTvToCard(tv: TMDBTvShow, rank?: number): MediaCardModel {
  const year = tv.first_air_date ? tv.first_air_date.split('-')[0] : '';

  return {
    id: tv.id,
    type: 'tv',
    title: tv.name,
    meta: year ? `Series • ${year}` : 'Series',
    format: '4K HDR',
    imageUrl: getTmdbImageUrl(tv.poster_path, 'w500'),
    backdropUrl: getTmdbImageUrl(tv.backdrop_path, 'w1280'),
    rank,
    genreIds: tv.genre_ids,
    rating: tv.vote_average,
    overview: tv.overview,
    year,
  };
}
