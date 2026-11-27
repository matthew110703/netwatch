import type { MediaCardModel, TMDBGenre } from '@netwatch/core';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { PosterCard } from '@/components/poster-card';
import { AppIcon } from '@/components/ui/AppIcon';
import { fetchDiscoverByGenre } from '@/lib/api/discover';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type GenreFilterBarProps = {
  genres?: TMDBGenre[];
  mediaType: 'movie' | 'tv' | 'all';
};

export function GenreFilterBar({ genres = [], mediaType }: GenreFilterBarProps) {
  const { colors } = useNetwatchTheme();
  const [selectedGenre, setSelectedGenre] = useState<TMDBGenre>(
    genres[0] || { id: 0, name: 'All Genres' }
  );
  const [filteredItems, setFilteredItems] = useState<MediaCardModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (genres.length === 0) return null;

  const isFiltering = selectedGenre.id !== 0;

  const onSelectGenre = async (genre: TMDBGenre) => {
    setSelectedGenre(genre);
    abortRef.current?.abort();

    if (genre.id === 0) {
      setFilteredItems([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setHasError(false);

    try {
      const items = await fetchDiscoverByGenre(
        mediaType,
        genre.id,
        1,
        controller.signal
      );
      if (!controller.signal.aborted) {
        setFilteredItems(items);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setHasError(true);
        setFilteredItems([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          gap: 8,
        }}
      >
        {genres.map((genre) => {
          const active = selectedGenre.id === genre.id;
          return (
            <Pressable
              key={`${genre.id}-${genre.name}`}
              onPress={() => void onSelectGenre(genre)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${genre.name}`}
              accessibilityState={{ selected: active }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active
                  ? colors.primary
                  : colors.surfaceContainerHigh,
                borderWidth: 1,
                borderColor: active ? colors.primary : `${colors.outlineVariant}60`,
              }}
              className="active:opacity-85"
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: active ? colors.onPrimary : colors.onSurfaceVariant,
                }}
              >
                {genre.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isFiltering ? (
        <View
          style={{
            marginHorizontal: layout.gutter,
            padding: 14,
            borderRadius: 14,
            backgroundColor: colors.surfaceContainer,
            borderWidth: 1,
            borderColor: `${colors.outlineVariant}55`,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: colors.onSurface,
                }}
              >
                {selectedGenre.name}
              </Text>
              <Text style={{ fontSize: 11, color: colors.onSurfaceVariant }}>
                Live catalog matches
              </Text>
            </View>
            <Pressable
              onPress={() => void onSelectGenre({ id: 0, name: 'All Genres' })}
              accessibilityRole="button"
              accessibilityLabel="Clear genre filter"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: colors.surfaceContainerHigh,
                borderWidth: 1,
                borderColor: `${colors.outlineVariant}60`,
              }}
            >
              <AppIcon name="close" size={12} color={colors.onSurface} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: colors.onSurface,
                }}
              >
                Clear
              </Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : hasError || filteredItems.length === 0 ? (
            <Text
              style={{
                fontSize: 13,
                color: colors.onSurfaceVariant,
                textAlign: 'center',
                paddingVertical: 14,
              }}
            >
              {hasError
                ? 'Unable to load genre titles right now.'
                : `No ${selectedGenre.name} titles found.`}
            </Text>
          ) : (
            <FlatList
              horizontal
              nestedScrollEnabled
              data={filteredItems.slice(0, 14)}
              keyExtractor={(item) => `genre-${item.type}-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item }) => <PosterCard item={item} width={116} />}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}
