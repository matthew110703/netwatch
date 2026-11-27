import { MediaCardModel } from '@/lib/types';
import type { AniListMediaNode } from './types';
import { getAvailableEpisodes } from './episodes';
import { animeFormatLabel, plainSynopsis } from '@/lib/anime/presentation';

export function pickAniListTitle(media: AniListMediaNode): string {
  return (
    media.title.english?.trim() ||
    media.title.romaji?.trim() ||
    media.title.native?.trim() ||
    `Anime ${media.id}`
  );
}

export function mapAniListToCard(media: AniListMediaNode): MediaCardModel {
  const title = pickAniListTitle(media);
  const rating =
    typeof media.averageScore === 'number' && media.averageScore > 0
      ? media.averageScore / 10
      : undefined;
  const poster = media.coverImage?.large || media.coverImage?.extraLarge || '';
  const episodes = getAvailableEpisodes(media);
  const format = animeFormatLabel(media.format);
  const genres = (media.genres ?? []).filter(Boolean).slice(0, 4);

  return {
    id: media.id,
    type: 'anime',
    title,
    format,
    meta: [format, episodes ? `${episodes} eps` : null].filter(Boolean).join(' • '),
    genres,
    imageUrl: poster,
    backdropUrl: media.bannerImage ?? poster,
    rating,
    year: media.seasonYear ? String(media.seasonYear) : undefined,
    overview: plainSynopsis(media.description) || undefined,
    badge: media.status === 'RELEASING' ? 'AIRING' : undefined,
  };
}

export function mapAniListPage(media: AniListMediaNode[] | null | undefined): MediaCardModel[] {
  if (!media?.length) return [];
  return media.reduce<MediaCardModel[]>((acc, node) => {
    try {
      if (!node?.id) return acc;
      acc.push(mapAniListToCard(node));
    } catch (err) {
      console.warn('[AniList] map skipped:', err);
    }
    return acc;
  }, []);
}