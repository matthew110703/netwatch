import type { MediaCardModel } from '@netwatch/core';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';
import { useWatchlist } from '@/context/WatchlistContext';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type PosterCardProps = {
  item: MediaCardModel;
  width?: number;
  directToWatch?: boolean;
};

export function PosterCard({
  item,
  width = layout.posterWidth,
  directToWatch = false,
}: PosterCardProps) {
  const router = useRouter();
  const { colors } = useNetwatchTheme();
  const { isSaved, toggleWatchlist } = useWatchlist();
  const saved = isSaved(item.id, item.type);
  const { width: screenWidth } = useWindowDimensions();
  const showTextMeta = screenWidth >= 640;

  const matchScore =
    item.rating && item.rating > 0
      ? Math.min(99, Math.max(50, Math.round(item.rating * 10)))
      : null;

  const onPress = () => {
    if (directToWatch) {
      router.push(`/watch/${item.type}/${item.id}`);
      return;
    }
    router.push(`/${item.type}/${item.id}`);
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => void toggleWatchlist(item)}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${item.title}`}
      hitSlop={6}
      className="active:opacity-85"
      style={{ width }}
    >
      <View
        style={{
          overflow: 'hidden',
          borderRadius: layout.posterRadius,
          backgroundColor: colors.cardPlaceholder,
          borderWidth: 1,
          borderColor: saved ? colors.primary : `${colors.outlineVariant}45`,
        }}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width, height: Math.round(width * 1.5) }}
          contentFit="cover"
          transition={200}
        />

        {/* Top-left Match / Type Badge */}
        <View
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            backgroundColor: 'rgba(0,0,0,0.75)',
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: '800',
              color: matchScore ? '#34d399' : '#ffffff',
              letterSpacing: 0.4,
            }}
          >
            {matchScore ? `${matchScore}%` : item.type === 'tv' ? 'SERIES' : 'FILM'}
          </Text>
        </View>

        {/* Top-right Quick Watchlist Bookmark Toggle */}
        <Pressable
          onPress={() => void toggleWatchlist(item)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            saved ? `Remove ${item.title} from My List` : `Add ${item.title} to My List`
          }
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: saved ? colors.primary : 'rgba(0,0,0,0.68)',
          }}
        >
          <AppIcon
            name={saved ? 'check' : 'plus'}
            size={14}
            color={saved ? colors.onPrimary : '#ffffff'}
          />
        </Pressable>
      </View>

      {showTextMeta ? (
        <>
          <Text
            style={{
              marginTop: 7,
              fontSize: 13,
              fontWeight: '700',
              color: colors.onSurface,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 2,
            }}
          >
            {item.year ? (
              <Text style={{ fontSize: 11, color: colors.onSurfaceVariant }} numberOfLines={1}>
                {item.year}
              </Text>
            ) : null}
            {item.rating && item.rating > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <AppIcon name="star" size={11} color={colors.amber} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.amber }}>
                  {item.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </Pressable>
  );
}
