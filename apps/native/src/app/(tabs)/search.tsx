import type { MediaCardModel } from '@netwatch/core';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PosterCard } from '@/components/poster-card';
import { AppIcon } from '@/components/ui/AppIcon';
import { useWatchlist } from '@/context/WatchlistContext';
import { fetchSearchResults, type SearchCategory } from '@/lib/api/search';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

const QUICK_TAGS = [
  'Spider-Man',
  'Batman',
  'Dune',
  'Severance',
  'Oppenheimer',
  'Inception',
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useNetwatchTheme();
  const { isSaved, toggleWatchlist } = useWatchlist();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [items, setItems] = useState<MediaCardModel[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const gridCardWidth = Math.floor((screenWidth - layout.gutter * 2 - 24) / 3);

  const runSearch = async (q: string, cat: SearchCategory) => {
    const trimmed = q.trim();
    abortRef.current?.abort();

    if (!trimmed) {
      setItems([]);
      setSearched(false);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetchSearchResults(trimmed, cat, 1, controller.signal);
      if (!controller.signal.aborted) {
        setItems(res.data);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotalResults(res.totalResults);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Search failed');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setItems([]);
      setSearched(false);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      void runSearch(trimmed, category);
    }, 260);

    return () => clearTimeout(timer);
  }, [query, category]);

  const handleLoadMore = async () => {
    const trimmed = query.trim();
    if (!trimmed || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchSearchResults(trimmed, category, nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => `${i.type}:${i.id}`));
        const deduped = res.data.filter((i) => !seen.has(`${i.type}:${i.id}`));
        return [...prev, ...deduped];
      });
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      /* ignore load more error */
    } finally {
      setLoadingMore(false);
    }
  };

  const topMatches = items.slice(0, 3);
  const remainingMatches = items.slice(3);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        paddingTop: insets.top + 10,
      }}
    >
      {/* Search Bar & Category Tabs */}
      <View
        style={{
          paddingHorizontal: layout.gutter,
          paddingBottom: 12,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: `${colors.outlineVariant}35`,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 14,
            backgroundColor: colors.surfaceContainerHigh,
            borderWidth: 1,
            borderColor: `${colors.outlineVariant}60`,
            paddingHorizontal: 14,
          }}
        >
          <AppIcon
            name="search"
            size={18}
            color={colors.onSurfaceVariant}
            style={{ marginRight: 10 }}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void runSearch(query, category)}
            placeholder="Search movies, TV shows..."
            placeholderTextColor={colors.onSurfaceVariant}
            returnKeyType="search"
            autoCorrect={false}
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 16,
              fontWeight: '600',
              color: colors.onSurface,
            }}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search query"
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceContainerHighest,
              }}
            >
              <AppIcon name="close" size={14} color={colors.onSurface} />
            </Pressable>
          ) : null}
        </View>

        {/* Category Filter Tabs */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {(
            [
              { id: 'all', label: 'All Matches', icon: 'sparkles' as const },
              { id: 'movie', label: 'Movies', icon: 'film-outline' as const },
              { id: 'tv', label: 'TV Shows', icon: 'tv-outline' as const },
            ] as const
          ).map((tab) => {
            const active = category === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setCategory(tab.id)}
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

          {loading ? (
            <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 24,
        }}
      >
        {/* Error State */}
        {error ? (
          <View
            style={{
              padding: 20,
              borderRadius: 14,
              backgroundColor: colors.surfaceContainer,
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center' }}>
              {error}
            </Text>
            <Pressable
              onPress={() => void runSearch(query, category)}
              accessibilityRole="button"
              accessibilityLabel="Retry search"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.onPrimary }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Empty / Discovery Quick Tags State */}
        {!loading && !error && items.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.surfaceContainerHigh,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcon name="search" size={26} color={colors.primary} />
            </View>
            <View style={{ alignItems: 'center', gap: 6, maxWidth: 300 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.onSurface,
                  textAlign: 'center',
                }}
              >
                {searched && query.trim()
                  ? `No titles matched "${query.trim()}"`
                  : 'Search Netwatch Catalog'}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.onSurfaceVariant,
                  textAlign: 'center',
                  lineHeight: 19,
                }}
              >
                {searched && query.trim()
                  ? 'Check your spelling, switch categories, or try another title.'
                  : 'Search movies or TV series across TMDB. Try a quick query below:'}
              </Text>
            </View>

            {!query.trim() ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {QUICK_TAGS.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => setQuery(tag)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${tag}`}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: colors.surfaceContainerHigh,
                      borderWidth: 1,
                      borderColor: `${colors.outlineVariant}60`,
                    }}
                    className="active:opacity-80"
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: colors.onSurface,
                      }}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Section 1: Top Matches */}
        {topMatches.length > 0 ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name="star" size={17} color={colors.primary} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.onSurface,
                }}
              >
                Top Matches
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              {topMatches.map((item) => {
                const saved = isSaved(item.id, item.type);
                const matchLabel =
                  item.badge ||
                  (item.rating && item.rating > 0
                    ? `${Math.min(99, Math.max(50, Math.round(item.rating * 10)))}% MATCH`
                    : item.type.toUpperCase());

                return (
                  <Pressable
                    key={`top-${item.type}-${item.id}`}
                    onPress={() => router.push(`/${item.type}/${item.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Details for ${item.title}`}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: colors.surfaceContainer,
                      borderWidth: 1,
                      borderColor: `${colors.outlineVariant}55`,
                    }}
                    className="active:opacity-90"
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{
                        width: 84,
                        height: 126,
                        borderRadius: 8,
                        backgroundColor: colors.cardPlaceholder,
                      }}
                      contentFit="cover"
                    />
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'space-between',
                        paddingVertical: 2,
                      }}
                    >
                      <View style={{ gap: 4 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: colors.primary,
                            }}
                          >
                            {matchLabel}
                          </Text>
                          {item.year ? (
                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.onSurfaceVariant,
                              }}
                            >
                              {item.year}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '800',
                            color: colors.onSurface,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.onSurfaceVariant,
                            lineHeight: 17,
                          }}
                          numberOfLines={2}
                        >
                          {item.overview || item.meta}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        <Pressable
                          onPress={() => router.push(`/watch/${item.type}/${item.id}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`Play ${item.title}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 14,
                            paddingVertical: 7,
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
                            Play
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => router.push(`/${item.type}/${item.id}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`Info for ${item.title}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: colors.surfaceContainerHigh,
                            borderWidth: 1,
                            borderColor: `${colors.outlineVariant}60`,
                          }}
                        >
                          <AppIcon name="info" size={13} color={colors.onSurface} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: colors.onSurface,
                            }}
                          >
                            Details
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => void toggleWatchlist(item)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            saved ? 'Remove from My List' : 'Add to My List'
                          }
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: saved
                              ? `${colors.primary}28`
                              : colors.surfaceContainerHigh,
                            borderWidth: 1,
                            borderColor: saved
                              ? colors.primary
                              : `${colors.outlineVariant}60`,
                          }}
                        >
                          <AppIcon
                            name={saved ? 'check' : 'plus'}
                            size={15}
                            color={saved ? colors.primary : colors.onSurface}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Section 2: Explore All Results Grid */}
        {remainingMatches.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.onSurface,
              }}
            >
              Explore All Results (
              {totalResults > items.length
                ? `${items.length} of ${totalResults}`
                : items.length}
              )
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {remainingMatches.map((item) => (
                <PosterCard
                  key={`grid-${item.type}-${item.id}`}
                  item={item}
                  width={gridCardWidth}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Load More Pagination */}
        {items.length > 0 && page < totalPages ? (
          <Pressable
            onPress={() => void handleLoadMore()}
            disabled={loadingMore}
            accessibilityRole="button"
            accessibilityLabel="Load More Results"
            style={{
              alignSelf: 'center',
              paddingHorizontal: 22,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: colors.surfaceContainerHigh,
              borderWidth: 1,
              borderColor: `${colors.outlineVariant}60`,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: colors.onSurface,
              }}
            >
              {loadingMore ? 'Loading more…' : 'Load More Results'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
