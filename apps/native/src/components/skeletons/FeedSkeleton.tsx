import { Dimensions, View } from 'react-native';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

const { width: windowWidth } = Dimensions.get('window');

export function FeedSkeleton() {
  const { colors } = useNetwatchTheme();
  const heroH = Math.round(windowWidth * layout.heroHeightRatio);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          height: heroH,
          backgroundColor: colors.surfaceContainer,
          marginBottom: layout.sectionGap,
        }}
      />
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ marginBottom: layout.sectionGap, paddingHorizontal: layout.gutter }}>
          <View
            style={{
              height: 18,
              width: '45%',
              borderRadius: 4,
              backgroundColor: colors.surfaceContainerHigh,
              marginBottom: 12,
            }}
          />
          <View style={{ flexDirection: 'row', gap: layout.railGap }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: layout.posterWidth,
                  height: layout.posterWidth * 1.5,
                  borderRadius: layout.posterRadius,
                  backgroundColor: colors.cardPlaceholder,
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}