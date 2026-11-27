import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenState } from '@/components/screen-state';
import { AppIcon } from '@/components/ui/AppIcon';
import { useWatchlist } from '@/context/WatchlistContext';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type FilterType = 'all' | 'movie' | 'tv';

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useNetwatchTheme();
  const { watchlistItems, isLoading, toggleWatchlist, refreshWatchlist } =
    useWatchlist();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = Math.floor((screenWidth - layout.gutter * 2 - 12) / 2);

  useFocusEffect(
    useCallback(() => {
      void refreshWatchlist();
    }, [refreshWatchlist])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshWatchlist();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (filter === 'all') return watchlistItems;
    return watchlistItems.filter((item) => item.type === filter);
  }, [watchlistItems, filter]);

  const movieCount = useMemo(
    () => watchlistItems.filter((i) => i.type === 'movie').length,
    [watchlistItems]
  );
  const tvCount = useMemo(
    () => watchlistItems.filter((i) => i.type === 'tv').length,
    [watchlistItems]
  );

  if (isLoading && watchlistItems.length === 0) {
    return <ScreenState mode="loading" message="Loading your list…" />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        paddingTop: insets.top + 12,
      }}
    >
      {/* Header & Filter Tabs matching Web WatchlistPage */}
      <View
        style={{
          paddingHorizontal: layout.gutter,
          paddingBottom: 14,
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: `${colors.outlineVariant}35`,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="bookmark" size={21} color={colors.primary} />
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '900',
                  color: colors.onSurface,
                  letterSpacing: -0.5,
                }}
              >
                My List
              </Text>
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: colors.surfaceContainerHigh,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: colors.primary,
                  }}
                >
                  {watchlistItems.length}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
              Saved movies and series synced across your Netwatch session
            </Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {(
            [
              { id: 'all', label: `All (${watchlistItems.length})`, icon: 'bookmark-outline' as const },
              { id: 'movie', label: `Movies (${movieCount})`, icon: 'film-outline' as const },
              { id: 'tv', label: `TV Shows (${tvCount})`, icon: 'tv-outline' as const },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setFilter(tab.id)}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: active
                    ? colors.primary
                    : colors.surfaceContainerHigh,
                  borderWidth: 1,
                  borderColor: active
                    ? colors.primary
                    : `${colors.outlineVariant}55`,
                }}
              >
                <AppIcon
                  name={tab.icon}
                  size={13}
                  color={active ? colors.onPrimary : colors.onSurfaceVariant}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: active ? colors.onPrimary : colors.onSurfaceVariant,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {filteredItems.length === 0 ? (
        <ScreenState
          mode="empty"
          message={
            watchlistItems.length === 0
              ? 'Your list is empty. Save titles from Home or browse for something new.'
              : `No ${filter === 'tv' ? 'TV shows' : 'movies'} saved in your list.`
          }
          actionLabel="Browse Home"
          onAction={() => router.push('/')}
        />
      ) : (
        <FlatList
          data={filteredItems}
          numColumns={2}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: layout.gutter,
            paddingTop: 16,
            paddingBottom: 32,
            gap: 14,
          }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <View
              style={{
                width: cardWidth,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: colors.surfaceContainer,
                borderWidth: 1,
                borderColor: `${colors.outlineVariant}45`,
              }}
            >
              <Pressable
                onPress={() => router.push(`/${item.type}/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Details for ${item.title}`}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{
                    width: cardWidth,
                    height: Math.round(cardWidth * 1.42),
                    backgroundColor: colors.cardPlaceholder,
                  }}
                  contentFit="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#ffffff',
                    }}
                  >
                    {item.type === 'tv' ? 'TV' : 'MOVIE'}
                  </Text>
                </View>

                <Pressable
                  onPress={() => void toggleWatchlist(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.title} from My List`}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(0,0,0,0.72)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="trash" size={14} color="#ffffff" />
                </Pressable>
              </Pressable>

              <View style={{ padding: 10, gap: 8 }}>
                <View style={{ gap: 2 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: colors.onSurface,
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.onSurfaceVariant,
                    }}
                    numberOfLines={1}
                  >
                    {item.meta || item.year || ''}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => router.push(`/watch/${item.type}/${item.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Watch ${item.title}`}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <AppIcon name="play" size={13} color={colors.onPrimary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: colors.onPrimary,
                      }}
                    >
                      Watch
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/${item.type}/${item.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Info for ${item.title}`}
                    style={{
                      paddingHorizontal: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: colors.surfaceContainerHigh,
                      borderWidth: 1,
                      borderColor: `${colors.outlineVariant}60`,
                    }}
                  >
                    <AppIcon name="info" size={15} color={colors.onSurface} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
