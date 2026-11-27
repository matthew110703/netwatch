export interface AniListTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

export interface AniListMediaNode {
  id: number;
  idMal?: number | null;
  title: AniListTitle;
  episodes?: number | null;
  nextAiringEpisode?: { episode: number; timeUntilAiring?: number } | null;
  status?: string | null;
  format?: string | null;
  seasonYear?: number | null;
  season?: string | null;
  averageScore?: number | null;
  duration?: number | null;
  genres?: string[] | null;
  description?: string | null;
  coverImage?: {
    large?: string | null;
    extraLarge?: string | null;
    color?: string | null;
  } | null;
  bannerImage?: string | null;
  studios?: { nodes?: { name: string }[] | null } | null;
  streamingEpisodes?: { title?: string | null; thumbnail?: string | null }[] | null;
  relations?: { edges?: AniListRelationEdge[] | null } | null;
}

export interface AniListRelationEdge {
  relationType?: string | null;
  node?: AniListMediaNode | null;
}

export interface AniListPageInfo {
  total?: number | null;
  currentPage?: number | null;
  lastPage?: number | null;
  hasNextPage?: boolean | null;
}

export interface AniListPage {
  pageInfo?: AniListPageInfo | null;
  media?: AniListMediaNode[] | null;
}

export interface AniListLandingData {
  trending: AniListPage;
  popular: AniListPage;
  topScored: AniListPage;
  thisSeason: AniListPage;
  airing: AniListPage;
}

export interface AniListDetailData {
  Media: AniListMediaNode & {
    recommendations?: {
      nodes?: { mediaRecommendation?: AniListMediaNode | null }[] | null;
    } | null;
  };
}

export interface AniListSearchData {
  Page: AniListPage;
}