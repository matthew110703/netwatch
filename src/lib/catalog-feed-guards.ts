import {
  HomeFeedData,
  MoviesFeedData,
  TvFeedData,
} from '@/services/catalog.service';

export function homeFeedHasContent(data: HomeFeedData): boolean {
  return (
    Boolean(data.billboardItem) ||
    data.trendingItems.length > 0 ||
    data.topPicksItems.length > 0 ||
    data.popularTvItems.length > 0 ||
    data.topRatedItems.length > 0
  );
}

export function moviesFeedHasContent(data: MoviesFeedData): boolean {
  return (
    data.popularMovies.length > 0 ||
    data.topRatedMovies.length > 0 ||
    data.nowPlayingMovies.length > 0
  );
}

export function tvFeedHasContent(data: TvFeedData): boolean {
  return data.popularTv.length > 0 || data.topRatedTv.length > 0 || data.onTheAirTv.length > 0;
}