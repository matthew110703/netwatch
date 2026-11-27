import type { MediaCardModel } from '@netwatch/core';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type RankedPosterCardProps = {
  item: MediaCardModel;
  rank: number;
};

export function RankedPosterCard({ item, rank }: RankedPosterCardProps) {
  const router = useRouter();
  const { colors } = useNetwatchTheme();
  const w = layout.posterWidth;
  const numeralW = layout.rankedNumeralSize;

  return (
    <Pressable
      onPress={() => router.push(`/${item.type}/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${item.title}`}
      style={{
        width: w + numeralW * 0.45,
        flexDirection: 'row',
        alignItems: 'flex-end',
      }}
      className="active:opacity-90"
    >
      <Text
        style={{
          width: numeralW,
          fontSize: numeralW * 0.92,
          lineHeight: numeralW,
          fontWeight: '900',
          color: colors.rankFill,
          marginRight: -numeralW * 0.35,
          zIndex: 0,
          textShadowColor: colors.rankStroke,
          textShadowOffset: { width: -1, height: 1 },
          textShadowRadius: 3,
        }}
      >
        {rank}
      </Text>
      <View
        style={{
          width: w,
          borderRadius: layout.posterRadius,
          overflow: 'hidden',
          backgroundColor: colors.cardPlaceholder,
          borderWidth: 1,
          borderColor: `${colors.outlineVariant}45`,
          zIndex: 1,
        }}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: w, height: Math.round(w * 1.5) }}
          contentFit="cover"
          transition={200}
        />
        <View
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            backgroundColor: 'rgba(0,0,0,0.78)',
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary }}>
            TOP {rank}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
