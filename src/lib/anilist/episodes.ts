import type { AniListMediaNode } from './types';

/** Derive playable episode count when `episodes` is null for airing titles. */
export function getAvailableEpisodes(media: Pick<AniListMediaNode, 'episodes' | 'nextAiringEpisode'>): number {
  if (media.episodes && media.episodes > 0) return media.episodes;
  if (media.nextAiringEpisode && media.nextAiringEpisode.episode > 1) {
    return media.nextAiringEpisode.episode - 1;
  }
  return 12;
}