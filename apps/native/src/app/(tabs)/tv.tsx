import { useCallback, useEffect, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { GenreFilterBar } from '@/components/genre-filter/GenreFilterBar';
import { HomeTopBar } from '@/components/home-top-bar/HomeTopBar';
import { MediaRail } from '@/components/media-rail';
import { ScreenState } from '@/components/screen-state';
import { FeedSkeleton } from '@/components/skeletons/FeedSkeleton';
import { fetchTvFeed, type TvFeed } from '@/lib/api/tv';
import { HomeBillboard } from '@/modules/home/HomeBillboard';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

const SCROLL_ELEVATE_AT = 100;

export default function TvScreen() {
  const { colors } = useNetwatchTheme();
  const [feed, setFeed] = useState<TvFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barElevated, setBarElevated] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      setFeed(await fetchTvFeed());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load TV');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = y > SCROLL_ELEVATE_AT;
    setBarElevated((prev) => (prev === next ? prev : next));
  };

  if (loading && !feed) return <FeedSkeleton />;
  if (error && !feed) {
    return (
      <ScreenState
        mode="error"
        message={error}
        onRetry={() => void load()}
      />
    );
  }
  if (!feed) return <ScreenState mode="empty" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <HomeTopBar elevated={barElevated} />
      <ScrollView
        style={{ flex: 1 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ gap: layout.sectionGap, paddingBottom: 36 }}
      >
        {feed.spotlightTv ? <HomeBillboard item={feed.spotlightTv} /> : null}
        {feed.genres && feed.genres.length > 0 ? (
          <GenreFilterBar genres={feed.genres} mediaType="tv" />
        ) : null}
        <MediaRail
          title="Popular TV Series"
          subtitle="Most-streamed multi-season series right now"
          items={feed.popularTv}
        />
        <MediaRail
          title="Currently Airing • New Episodes"
          subtitle="Weekly broadcast and streaming premieres"
          items={feed.onTheAirTv}
          variant="backdrop"
        />
        <MediaRail
          title="All-Time Top Rated Series"
          subtitle="Prestige television with universal audience acclaim"
          items={feed.topRatedTv}
        />
      </ScrollView>
    </View>
  );
}
