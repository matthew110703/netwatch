import type { MediaCardModel } from '@netwatch/core';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BackdropCard } from '@/components/backdrop-card/BackdropCard';
import { RankedPosterCard } from '@/components/ranked-poster-card/RankedPosterCard';
import { AppIcon } from '@/components/ui/AppIcon';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';
import { PosterCard } from '../poster-card';

export type MediaRailVariant = 'poster' | 'ranked' | 'backdrop';

type MediaRailProps = {
  title: string;
  subtitle?: string;
  items: MediaCardModel[];
  showRank?: boolean;
  variant?: MediaRailVariant;
  directToWatch?: boolean;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function MediaRail({
  title,
  subtitle,
  items,
  showRank,
  variant,
  directToWatch = false,
  actionLabel,
  onActionPress,
}: MediaRailProps) {
  const { colors } = useNetwatchTheme();

  if (items.length === 0) return null;

  const resolvedVariant: MediaRailVariant =
    variant ?? (showRank ? 'ranked' : 'poster');

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingHorizontal: layout.gutter,
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: colors.onSurface,
              letterSpacing: -0.3,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onActionPress && actionLabel ? (
          <Pressable
            onPress={onActionPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            className="active:opacity-80"
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.primary,
              }}
            >
              {actionLabel}
            </Text>
            <AppIcon name="forward" size={13} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        horizontal
        nestedScrollEnabled
        data={items}
        keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: layout.railGap,
          paddingHorizontal: layout.gutter,
        }}
        renderItem={({ item, index }) => {
          const rank = item.rank ?? index + 1;
          if (resolvedVariant === 'ranked') {
            return <RankedPosterCard item={item} rank={rank} />;
          }
          if (resolvedVariant === 'backdrop') {
            return <BackdropCard item={item} directToWatch={directToWatch} />;
          }
          return (
            <PosterCard
              item={item}
              width={layout.posterWidth}
              directToWatch={directToWatch}
            />
          );
        }}
      />
    </View>
  );
}
