export const ANILIST_MEDIA_CARD_FIELDS = `
  id
  idMal
  title { romaji english native }
  episodes
  nextAiringEpisode { episode timeUntilAiring }
  status
  format
  seasonYear
  season
  averageScore
  duration
  genres
  coverImage { large extraLarge color }
  bannerImage
`;

export const ANILIST_LANDING_QUERY = `
query AnimeLanding($perPage: Int, $season: MediaSeason, $seasonYear: Int) {
  trending: Page(page: 1, perPage: $perPage) {
    media(type: ANIME, isAdult: false, sort: TRENDING_DESC) { ${ANILIST_MEDIA_CARD_FIELDS} }
  }
  popular: Page(page: 1, perPage: $perPage) {
    media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) { ${ANILIST_MEDIA_CARD_FIELDS} }
  }
  topScored: Page(page: 1, perPage: $perPage) {
    media(type: ANIME, isAdult: false, sort: SCORE_DESC) { ${ANILIST_MEDIA_CARD_FIELDS} }
  }
  thisSeason: Page(page: 1, perPage: $perPage) {
    media(type: ANIME, isAdult: false, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) {
      ${ANILIST_MEDIA_CARD_FIELDS}
    }
  }
  airing: Page(page: 1, perPage: $perPage) {
    media(type: ANIME, isAdult: false, status: RELEASING, sort: POPULARITY_DESC) { ${ANILIST_MEDIA_CARD_FIELDS} }
  }
}
`;

const ANILIST_SEASON_NODE = `
  id
  type
  format
  title { romaji english }
  episodes
  seasonYear
  relations {
    edges {
      relationType
      node { id format }
    }
  }
`;

export const ANILIST_SEASON_LINKS_QUERY = `
query AnimeSeasonLinks($ids: [Int]) {
  Page(page: 1, perPage: 50) {
    media(id_in: $ids, type: ANIME, isAdult: false) {
      ${ANILIST_SEASON_NODE}
    }
  }
}
`;

export const ANILIST_DETAIL_QUERY = `
query AnimeDetail($id: Int) {
  Media(id: $id, type: ANIME, isAdult: false) {
    ${ANILIST_MEDIA_CARD_FIELDS}
    description(asHtml: false)
    studios(isMain: true) { nodes { name } }
    streamingEpisodes { title thumbnail }
    recommendations(perPage: 12, sort: RATING_DESC) {
      nodes { mediaRecommendation { ${ANILIST_MEDIA_CARD_FIELDS} } }
    }
    relations {
      edges {
        relationType
        node { ${ANILIST_SEASON_NODE} }
      }
    }
  }
}
`;

export const ANILIST_SEARCH_QUERY = `
query AnimeSearch($page: Int, $perPage: Int, $search: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, isAdult: false, search: $search, sort: SEARCH_MATCH) {
      ${ANILIST_MEDIA_CARD_FIELDS}
    }
  }
}
`;

export function currentAnimeSeason(): { season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'; seasonYear: number } {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  if (month <= 3) return { season: 'WINTER', seasonYear: year };
  if (month <= 6) return { season: 'SPRING', seasonYear: year };
  if (month <= 9) return { season: 'SUMMER', seasonYear: year };
  return { season: 'FALL', seasonYear: year };
}