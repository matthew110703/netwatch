import type { MediaCardModel, TMDBGenre } from '@netwatch/core';
import { resolveNetwatchBaseUrl } from '../config';

export type MoviesFeed = {
  spotlightMovie: MediaCardModel | null;
  popularMovies: MediaCardModel[];
  topRatedMovies: MediaCardModel[];
  nowPlayingMovies: MediaCardModel[];
  genres?: TMDBGenre[];
};

export async function fetchMoviesFeed(): Promise<MoviesFeed> {
  const base = await resolveNetwatchBaseUrl();
  const res = await fetch(`${base}/api/movies`);
  const json = (await res.json()) as { success?: boolean; data?: MoviesFeed; error?: string };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || `Movies feed failed (${res.status})`);
  }
  return json.data;
}
