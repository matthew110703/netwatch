import type { MediaCardModel } from '@netwatch/core';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Dimensions, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppIcon } from '@/components/ui/AppIcon';
import { useWatchlist } from '@/context/WatchlistContext';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type HomeBillboardProps = {
  item: MediaCardModel;
  fullBleed?: boolean;
  isLive?: boolean;
};

const window = Dimensions.get('window');

export function HomeBillboard({
  item,
  fullBleed = true,
  isLive = true,
}: HomeBillboardProps) {
  const router = useRouter();
  const { colors } = useNetwatchTheme();
  const { isSaved, toggleWatchlist } = useWatchlist();
  const saved = isSaved(item.id, item.type);

  const image = item.backdropUrl || item.imageUrl;
  const heroHeight = fullBleed
    ? Math.round(window.height * layout.heroHeightRatio)
    : 280;

  const matchScore =
    item.rating && item.rating > 0
      ? Math.min(99, Math.max(50, Math.round(item.rating * 10)))
      : null;

  const onPlay = () => {
    router.push(`/watch/${item.type}/${item.id}`);
  };

  const onDetails = () => {
    router.push(`/${item.type}/${item.id}`);
  };

  return (
    <View style={{ width: '100%', height: heroHeight }}>
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{ width: '100%', height: heroHeight }}
      >
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: heroHeight }}
          contentFit="cover"
        />
      </Animated.View>

      {/* Multi-stop cinematic depth scrim */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '32%',
          backgroundColor: 'rgba(0,0,0,0.28)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '72%',
          backgroundColor: 'rgba(14,14,14,0.48)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '46%',
          backgroundColor: colors.heroScrim,
        }}
      />

      {/* Billboard Foreground Content */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: layout.gutter,
          paddingBottom: layout.gutter + 6,
          gap: 8,
        }}
      >
        {/* Live Uplink & Format Badges */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.68)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: isLive ? '#34d399' : '#9ca3af',
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: '#ffffff',
                letterSpacing: 0.4,
              }}
            >
              {isLive ? 'LIVE UPLINK' : 'ARCHIVE VAULT'}
            </Text>
          </View>

          {item.badge ? (
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: `${colors.primary}30`,
                borderWidth: 1,
                borderColor: `${colors.primary}75`,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: '#ffffff',
                  letterSpacing: 0.6,
                }}
              >
                {item.badge.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {item.format ? (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 5,
                backgroundColor: 'rgba(0,0,0,0.65)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {item.format}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '900',
            color: '#ffffff',
            letterSpacing: -0.5,
            lineHeight: 33,
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Metadata Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {matchScore ? (
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#34d399' }}>
              {matchScore}% Match
            </Text>
          ) : null}
          {item.year ? (
            <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.82)' }}>
              {item.year}
            </Text>
          ) : null}
          {item.meta ? (
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>
              {item.meta}
            </Text>
          ) : null}
          {item.rating && item.rating > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <AppIcon name="star" size={12} color="#fbbf24" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fbbf24' }}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Synopsis */}
        {item.overview ? (
          <Text
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.82)',
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {item.overview}
          </Text>
        ) : null}

        {/* Action Row: Play | My List | Info */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Pressable
            onPress={onPlay}
            style={{
              flex: 1.2,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 10,
              paddingVertical: 12,
              backgroundColor: colors.primary,
            }}
            className="active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel="Play"
          >
            <AppIcon name="play" size={15} color={colors.onPrimary} />
            <Text style={{ fontSize: 14, fontWeight: '900', color: colors.onPrimary }}>
              Play
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void toggleWatchlist(item)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              borderRadius: 10,
              paddingVertical: 12,
              backgroundColor: saved
                ? `${colors.primary}38`
                : 'rgba(255,255,255,0.16)',
              borderWidth: 1,
              borderColor: saved
                ? colors.primary
                : 'rgba(255,255,255,0.26)',
            }}
            className="active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel="Add to list"
          >
            <AppIcon
              name={saved ? 'check' : 'plus'}
              size={16}
              color="#ffffff"
            />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
              {saved ? 'In My List' : 'My List'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onDetails}
            style={{
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              borderRadius: 10,
              paddingVertical: 12,
              backgroundColor: 'rgba(0,0,0,0.58)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.24)',
            }}
            className="active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel="Details"
          >
            <AppIcon name="info" size={16} color="#ffffff" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
              Info
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
