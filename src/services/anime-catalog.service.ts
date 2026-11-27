import {
  ANILIST_DETAIL_QUERY,
  ANILIST_LANDING_QUERY,
  ANILIST_SEARCH_QUERY,
  ANILIST_SEASON_LINKS_QUERY,
  currentAnimeSeason,
} from '@/lib/anilist/queries';
import { createAniListQuery, AniListRateLimitError } from '@/lib/anilist/client';
import { mapAniListPage, mapAniListToCard, pickAniListTitle } from '@/lib/anilist/map';
import { plainSynopsis } from '@/lib/anime/presentation';
import { getAvailableEpisodes } from '@/lib/anilist/episodes';
import type {
  AniListDetailData,
  AniListLandingData,
  AniListMediaNode,
  AniListSearchData,
} from '@/lib/anilist/types';
import { MediaCardModel } from '@/lib/types';

const PER_PAGE = 12;

export interface AnimeFeedData {
  spotlightAnime: MediaCardModel | null;
  trending: MediaCardModel[];
  popular: MediaCardModel[];
  topScored: MediaCardModel[];
  thisSeason: MediaCardModel[];
  airing: MediaCardModel[];
}

export interface AnimeEpisodeStill {
  episode: number;
  title: string;
  image?: string;
}

export interface AnimeSeasonEntry {
  id: number;
  label: string;
  title: string;
  episodes: number;
  year?: number;
}

export interface AnimeDetailView {
  card: MediaCardModel;
  synopsis: string;
  episodes: number;
  idMal?: number | null;
  recommendations: MediaCardModel[];
  stills: AnimeEpisodeStill[];
  seasons: AnimeSeasonEntry[];
}

const SEASON_RELATIONS = new Set(['PREQUEL', 'SEQUEL']);
const SEASON_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);

function seasonTitle(node: AniListMediaNode): string {
  return node.title?.english?.trim() || node.title?.romaji?.trim() || `Anime ${node.id}`;
}

function seasonLabel(title: string, index: number): string {
  const numbered = title.match(/season\s*(\d+)/i);
  const part = title.match(/part\s*(\d+)/i);
  if (/final season/i.test(title)) return part ? `Final part ${part[1]}` : 'Final season';
  if (numbered && part) return `Season ${Number(numbered[1])} part ${part[1]}`;
  if (numbered) return `Season ${Number(numbered[1])}`;
  if (part) return `Part ${Number(part[1])}`;
  return `Season ${index + 1}`;
}

function seasonNeighborIds(node: AniListMediaNode, known: Map<number, AniListMediaNode>): number[] {
  const ids: number[] = [];
  for (const edge of node.relations?.edges ?? []) {
    const id = edge?.node?.id;
    const format = edge?.node?.format;
    if (!id || known.has(id)) continue;
    if (!edge.relationType || !SEASON_RELATIONS.has(edge.relationType)) continue;
    if (format && !SEASON_FORMATS.has(format)) continue;
    ids.push(id);
  }
  return ids;
}

async function loadSeasonChain(root: AniListMediaNode): Promise<Map<number, AniListMediaNode>> {
  const full = new Map<number, AniListMediaNode>([[root.id, root]]);
  let pending = seasonNeighborIds(root, full);
  for (let hop = 0; hop < 6 && pending.length; hop += 1) {
    const ids = [...pending].sort((a, b) => a - b);
    try {
      const data = await createAniListQuery<{ Page?: { media?: AniListMediaNode[] | null } }>(
        ['anilist', 'season-links', ids.join('-')],
        ANILIST_SEASON_LINKS_QUERY,
        { ids }
      );
      for (const node of data.Page?.media ?? []) {
        if (node?.id) full.set(node.id, node);
      }
    } catch (error) {
      if (error instanceof AniListRateLimitError) break;
      console.error('[Anime Catalog] season links failed:', error);
      break;
    }
    const next = new Set<number>();
    for (const id of ids) {
      const node = full.get(id);
      if (!node) continue;
      for (const neighbor of seasonNeighborIds(node, full)) next.add(neighbor);
    }
    pending = [...next];
  }
  return full;
}

function collectSeasons(root: AniListMediaNode, full: Map<number, AniListMediaNode>): AnimeSeasonEntry[] {
  const visited = new Set<number>();
  const kept: AniListMediaNode[] = [];
  const queue = [root.id];
  while (queue.length) {
    const id = queue.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    const node = full.get(id);
    if (!node) continue;
    if (SEASON_FORMATS.has(node.format ?? '')) kept.push(node);
    for (const edge of node.relations?.edges ?? []) {
      if (!edge?.relationType || !SEASON_RELATIONS.has(edge.relationType) || !edge.node?.id) continue;
      queue.push(edge.node.id);
    }
  }

  return kept
    .sort((a, b) => (a.seasonYear ?? 0) - (b.seasonYear ?? 0) || a.id - b.id)
    .map((node, index) => {
      const title = seasonTitle(node);
      return {
        id: node.id,
        title,
        label: seasonLabel(title, index),
        episodes: node.episodes && node.episodes > 0 ? node.episodes : 0,
        year: node.seasonYear ?? undefined,
      };
    });
}

function mapStreamingStills(
  episodes: { title?: string | null; thumbnail?: string | null }[] | null | undefined
): AnimeEpisodeStill[] {
  if (!episodes?.length) return [];
  return episodes.reduce<AnimeEpisodeStill[]>((acc, entry, index) => {
    const title = entry.title?.trim() || `Episode ${index + 1}`;
    const match = title.match(/episode\s*(\d+)/i) || title.match(/(\d+)/);
    const episode = match ? Number(match[1]) : index + 1;
    if (!Number.isFinite(episode) || episode < 1) return acc;
    acc.push({
      episode,
      title,
      image: entry.thumbnail?.trim() || undefined,
    });
    return acc;
  }, []);
}

export async function getAnimeFeedData(): Promise<AnimeFeedData> {
  const { season, seasonYear } = currentAnimeSeason();

  try {
    const data = await createAniListQuery<AniListLandingData>(
      ['anilist', 'landing', season, String(seasonYear)],
      ANILIST_LANDING_QUERY,
      { perPage: PER_PAGE, season, seasonYear }
    );

    const trending = mapAniListPage(data.trending?.media);
    const popular = mapAniListPage(data.popular?.media);
    const topScored = mapAniListPage(data.topScored?.media);
    const thisSeason = mapAniListPage(data.thisSeason?.media);
    const airing = mapAniListPage(data.airing?.media);

    const heroSource = trending[0] || popular[0] || topScored[0] || null;
    const spotlightAnime = heroSource
      ? {
          ...heroSource,
          badge: 'FEATURED ANIME',
          format: heroSource.meta,
        }
      : null;

    return {
      spotlightAnime,
      trending,
      popular,
      topScored,
      thisSeason,
      airing,
    };
  } catch (error) {
    console.error('[Anime Catalog] landing failed:', error);
    return {
      spotlightAnime: null,
      trending: [],
      popular: [],
      topScored: [],
      thisSeason: [],
      airing: [],
    };
  }
}

export async function getAnimeDetailData(id: number): Promise<AnimeDetailView | null> {
  try {
    const data = await createAniListQuery<AniListDetailData>(
      ['anilist', 'detail', 'season-chain', String(id)],
      ANILIST_DETAIL_QUERY,
      { id }
    );

    const media = data.Media;
    if (!media?.id) return null;

    const card = mapAniListToCard(media);
    const episodes = getAvailableEpisodes(media);
    const recommendations =
      media.recommendations?.nodes
        ?.map((node) => node.mediaRecommendation)
        .filter((m): m is NonNullable<typeof m> => Boolean(m?.id))
        .map((m) => mapAniListToCard(m)) ?? [];

    return {
      card: { ...card, title: pickAniListTitle(media) },
      synopsis: plainSynopsis(media.description) || card.overview || '',
      episodes,
      idMal: media.idMal,
      recommendations,
      stills: mapStreamingStills(media.streamingEpisodes),
      seasons: collectSeasons(media, await loadSeasonChain(media)),
    };
  } catch (error) {
    if (error instanceof AniListRateLimitError) {
      console.warn('[Anime Catalog] detail rate limited');
    } else {
      console.error('[Anime Catalog] detail failed:', error);
    }
    return null;
  }
}

export async function searchAniList(
  search: string,
  page = 1
): Promise<{
  results: MediaCardModel[];
  pageInfo: { currentPage: number; lastPage: number; hasNextPage: boolean; total: number };
}> {
  if (search.trim().length < 2) {
    return {
      results: [],
      pageInfo: { currentPage: 1, lastPage: 1, hasNextPage: false, total: 0 },
    };
  }

  try {
    const data = await createAniListQuery<AniListSearchData>(
      ['anilist', 'search', search.trim().toLowerCase(), String(page)],
      ANILIST_SEARCH_QUERY,
      { page, perPage: 20, search: search.trim() }
    );

    const pageInfo = data.Page?.pageInfo;
    return {
      results: mapAniListPage(data.Page?.media),
      pageInfo: {
        currentPage: pageInfo?.currentPage ?? page,
        lastPage: pageInfo?.lastPage ?? page,
        hasNextPage: Boolean(pageInfo?.hasNextPage),
        total: pageInfo?.total ?? 0,
      },
    };
  } catch (error) {
    console.error('[Anime Catalog] search failed:', error);
    return {
      results: [],
      pageInfo: { currentPage: page, lastPage: page, hasNextPage: false, total: 0 },
    };
  }
}