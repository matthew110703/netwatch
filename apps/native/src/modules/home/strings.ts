export const HOME_STRINGS = {
  trendingTitle: 'Top 10 Trending Today',
  trendingSubtitle: 'Highest velocity streams across the network this cycle',
  topPicksTitle: 'Now Streaming • In Theaters',
  topPicksSubtitle: 'Critical premieres with immersive audio',
  popularTvTitle: 'Binge-Worthy TV Series',
  popularTvSubtitle: 'Compelling narratives and multi-season sagas',
  topRatedTitle: 'Critically Acclaimed Masterpieces',
  topRatedSubtitle: 'Universal acclaim with pristine preservation',
  regionChartsHeading: 'Charts in your region',
  regionChartsSubtitle: 'Popular titles available to stream in the country you selected',
  regionTopMoviesTitle: 'Top 10 Movies in {country}',
  regionTopMoviesSubtitle: 'Ranked by catalog popularity in this region',
  regionTopTvTitle: 'Top 10 TV in {country}',
  regionTopTvSubtitle: 'Series trending in regional streaming catalogs',
} as const;

export function withCountry(template: string, country: string): string {
  return template.replace('{country}', country);
}