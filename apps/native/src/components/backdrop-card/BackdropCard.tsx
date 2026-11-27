import type { MediaCardModel } from '@netwatch/core';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type BackdropCardProps = {
  item: MediaCardModel;
  directToWatch?: boolean;
};

export function BackdropCard({ item, directToWatch = false }: BackdropCardProps) {
  const router = useRouter();
  const { colors } = useNetwatchTheme();
  const w = layout.backdropWidth;
  const h = Math.round(w * layout.backdropAspect);
  const image = item.backdropUrl || item.imageUrl;
  const hasProgress = typeof item.progress === 'number' && item.progress > 0;

  const onPress = () => {
    if (directToWatch || hasProgress) {
      if (item.type === 'tv' && item.resumeSeason && item.resumeEpisode) {
        router.push(
          `/watch/tv/${item.id}?s=${item.resumeSeason}&e=${item.resumeEpisode}`
        );
      } else {
        router.push(`/watch/${item.type}/${item.id}`);
      }
      return;
    }
    router.push(`/${item.type}/${item.id}`);
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${item.title}`}
      style={{ width: w }}
      className="active:opacity-90"
    >
      <View
        style={{
          borderRadius: layout.posterRadius,
          overflow: 'hidden',
          backgroundColor: colors.cardPlaceholder,
          borderWidth: 1,
          borderColor: `${colors.outlineVariant}45`,
        }}
      >
        <Image
          source={{ uri: image }}
          style={{ width: w, height: h }}
          contentFit="cover"
          transition={200}
        />

        {/* Top Badges */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {item.episodeInfo || item.badge ? (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 5,
                backgroundColor: 'rgba(0,0,0,0.75)',
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 0.4,
                }}
              >
                {(item.episodeInfo || item.badge || '').toUpperCase()}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {hasProgress ? (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcon
                name="play"
                size={13}
                color={colors.onPrimary}
                style={{ marginLeft: 1 }}
              />
            </View>
          ) : null}
        </View>

        {/* Bottom Title Scrim */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 10,
            paddingTop: 8,
            paddingBottom: hasProgress ? 10 : 8,
            backgroundColor: colors.heroScrim,
          }}
        >
          <Text
            style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.meta ? (
            <Text
              style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}
              numberOfLines={1}
            >
              {item.meta}
            </Text>
          ) : null}
        </View>

        {/* Progress Bar for Continue Watching */}
        {hasProgress ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 4,
              backgroundColor: 'rgba(255,255,255,0.22)',
            }}
          >
            <View
              style={{
                width: `${Math.min(100, Math.max(4, item.progress || 0))}%`,
                height: 4,
                backgroundColor: colors.primary,
              }}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
