import { CURATED_REGIONS } from '@netwatch/core';
import { ScrollView, Pressable, Text } from 'react-native';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type RegionSelectorProps = {
  value: string;
  onChange: (nextCode: string) => void;
};

export function RegionSelector({ value, onChange }: RegionSelectorProps) {
  const { colors } = useNetwatchTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: layout.gutter,
        gap: 8,
      }}
    >
      {CURATED_REGIONS.map((region) => {
        const active = region.code === value;
        return (
          <Pressable
            key={region.code}
            onPress={() => {
              if (!active) onChange(region.code);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Region ${region.label}`}
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: active
                ? `${colors.primary}22`
                : colors.surfaceContainer,
              borderWidth: 1,
              borderColor: active ? colors.primary : `${colors.outlineVariant}55`,
            }}
            className="active:opacity-85"
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: active ? '800' : '600',
                color: active ? colors.primary : colors.onSurfaceVariant,
              }}
            >
              {region.code} • {region.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
