import { DEFAULT_REGION, type MediaCardModel } from '@netwatch/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { GenreFilterBar } from '@/components/genre-filter/GenreFilterBar';
import { HomeTopBar } from '@/components/home-top-bar/HomeTopBar';
import { MediaRail } from '@/components/media-rail';
import { RegionSelector } from '@/components/region-selector/RegionSelector';
import { ScreenState } from '@/components/screen-state';
import { FeedSkeleton } from '@/components/skeletons/FeedSkeleton';
import { useWatchlist } from '@/context/WatchlistContext';
import { fetchContinueWatching } from '@/lib/api/history';
import { fetchHomeFeed, type HomeFeed } from '@/lib/api/home';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';
import { HomeBillboard } from './HomeBillboard';
import { HOME_STRINGS, withCountry } from './strings';

const SCROLL_ELEVATE_AT = 100;
const REGION_STORAGE_KEY = 'netwatch_native_region';

export function HomeScreen() {
  const router = useRouter();
  const { colors } = useNetwatchTheme();
  const { watchlistItems } = useWatchlist();
  const [region, setRegion] = useState<string>(DEFAULT_REGION);
  const [regionHydrated, setRegionHydrated] = useState(false);
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [continueWatching, setContinueWatching] = useState<MediaCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barElevated, setBarElevated] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await safeGetItem(REGION_STORAGE_KEY);
        if (stored && /^[A-Z]{2}$/.test(stored)) {
          setRegion(stored);
        }
      } catch {
        /* use default */
      } finally {
        setRegionHydrated(true);
      }
    })();
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const items = await fetchContinueWatching(12);
      setContinueWatching(items);
    } catch {
      /* optional rail */
    }
  }, []);

  const load = useCallback(
    async (targetRegion: string, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [homeData] = await Promise.all([
          fetchHomeFeed(targetRegion),
          loadHistory(),
        ]);
        setFeed(homeData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadHistory]
  );

  useEffect(() => {
    if (!regionHydrated) return;
    void load(region);
  }, [region, regionHydrated, load]);

  useFocusEffect(
    useCallback(() => {
      if (regionHydrated) {
        void loadHistory();
      }
    }, [regionHydrated, loadHistory])
  );

  const handleRegionChange = (nextCode: string) => {
    setRegion(nextCode);
    void safeSetItem(REGION_STORAGE_KEY, nextCode);
  };

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
        onRetry={() => void load(region)}
      />
    );
  }
  if (!feed) return <ScreenState mode="empty" />;

  const country = feed.regionLabel || region;

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
            onRefresh={() => void load(region, true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ gap: layout.sectionGap, paddingBottom: 36 }}
      >
        {feed.billboardItem ? (
          <HomeBillboard
            item={feed.billboardItem}
            isLive={feed.isLive ?? true}
          />
        ) : null}

        {/* Genre Micro-Slicing Filter Bar */}
        {feed.genres && feed.genres.length > 0 ? (
          <GenreFilterBar genres={feed.genres} mediaType="all" />
        ) : null}

        {/* Continue Watching Rail */}
        {continueWatching.length > 0 ? (
          <MediaRail
            title="Continue Watching"
            subtitle="Pick up right where you left off"
            items={continueWatching}
            variant="backdrop"
            directToWatch
          />
        ) : null}

        {/* My List Live Rail */}
        {watchlistItems.length > 0 ? (
          <MediaRail
            title="My List"
            subtitle="Titles saved to your watchlist"
            items={watchlistItems.slice(0, 12)}
            actionLabel="View All"
            onActionPress={() => router.push('/(tabs)/watchlist')}
          />
        ) : null}

        {/* Top 10 Trending */}
        <MediaRail
          title={HOME_STRINGS.trendingTitle}
          subtitle={HOME_STRINGS.trendingSubtitle}
          items={feed.trendingItems}
          variant="ranked"
        />

        {/* Regional Charts + Interactive Region Picker */}
        <View style={{ gap: 14 }}>
          <View style={{ gap: 4, paddingHorizontal: layout.gutter }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.onSurface,
                letterSpacing: -0.3,
              }}
            >
              {HOME_STRINGS.regionChartsHeading}
            </Text>
            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
              {HOME_STRINGS.regionChartsSubtitle}
            </Text>
          </View>

          <RegionSelector value={region} onChange={handleRegionChange} />

          <View style={{ gap: layout.sectionGap, marginTop: 4 }}>
            <MediaRail
              title={withCountry(HOME_STRINGS.regionTopMoviesTitle, country)}
              subtitle={HOME_STRINGS.regionTopMoviesSubtitle}
              items={feed.regionTopMovies}
              variant="ranked"
            />
            <MediaRail
              title={withCountry(HOME_STRINGS.regionTopTvTitle, country)}
              subtitle={HOME_STRINGS.regionTopTvSubtitle}
              items={feed.regionTopTv}
              variant="ranked"
            />
          </View>
        </View>

        {/* Top Picks (16:9 Backdrop cards matching web) */}
        <MediaRail
          title={HOME_STRINGS.topPicksTitle}
          subtitle={HOME_STRINGS.topPicksSubtitle}
          items={feed.topPicksItems}
          variant="backdrop"
        />

        {/* Binge-Worthy TV Series */}
        <MediaRail
          title={HOME_STRINGS.popularTvTitle}
          subtitle={HOME_STRINGS.popularTvSubtitle}
          items={feed.popularTvItems}
          actionLabel="Explore TV"
          onActionPress={() => router.push('/(tabs)/tv')}
        />

        {/* International Language Rails */}
        {feed.languageRails.map((rail) => (
          <MediaRail
            key={rail.code}
            title={rail.title}
            subtitle={rail.subtitle}
            items={rail.items}
          />
        ))}

        {/* Critically Acclaimed Masterpieces */}
        <MediaRail
          title={HOME_STRINGS.topRatedTitle}
          subtitle={HOME_STRINGS.topRatedSubtitle}
          items={feed.topRatedItems}
          actionLabel="Explore Movies"
          onActionPress={() => router.push('/(tabs)/movies')}
        />
      </ScrollView>
    </View>
  );
}
