import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/ui/AppIcon';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type HomeTopBarProps = {
  elevated: boolean;
};

function Chip({
  label,
  onPress,
  elevated,
}: {
  label: string;
  onPress: () => void;
  elevated: boolean;
}) {
  const { colors } = useNetwatchTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: elevated
          ? colors.surfaceContainerHigh
          : 'rgba(0,0,0,0.52)',
        borderWidth: 1,
        borderColor: elevated
          ? `${colors.outlineVariant}65`
          : 'rgba(255,255,255,0.22)',
      }}
      className="active:opacity-80"
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: elevated ? colors.onSurface : '#ffffff',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function HomeTopBar({ elevated }: HomeTopBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useNetwatchTheme();

  const barBg = elevated ? colors.surfaceLowest : 'transparent';
  const titleColor = elevated ? colors.onSurface : '#ffffff';
  const iconTint = elevated ? colors.onSurface : '#ffffff';

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 20,
        paddingTop: insets.top + 8,
        paddingBottom: 10,
        paddingHorizontal: layout.gutter,
        backgroundColor: barBg,
        borderBottomWidth: elevated ? 1 : 0,
        borderBottomColor: `${colors.outlineVariant}55`,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Identity matching Web NetwatchLogo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon
              name="play"
              size={14}
              color={colors.onPrimary}
              style={{ marginLeft: 1 }}
            />
          </View>
          <Text
            style={{
              fontSize: 21,
              fontWeight: '900',
              letterSpacing: -0.6,
              color: titleColor,
            }}
          >
            Net<Text style={{ color: colors.primary }}>watch</Text>
          </Text>
        </View>

        {/* Actions & Category Chips */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => router.push('/(tabs)/search')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open Search"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: elevated
                ? colors.surfaceContainerHigh
                : 'rgba(0,0,0,0.5)',
              borderWidth: 1,
              borderColor: elevated
                ? `${colors.outlineVariant}55`
                : 'rgba(255,255,255,0.2)',
            }}
            className="active:opacity-80"
          >
            <AppIcon name="search" size={16} color={iconTint} />
          </Pressable>

          <Pressable
            onPress={toggleTheme}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              isDark ? 'Switch to light theme' : 'Switch to dark theme'
            }
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: elevated
                ? colors.surfaceContainerHigh
                : 'rgba(0,0,0,0.5)',
              borderWidth: 1,
              borderColor: elevated
                ? `${colors.outlineVariant}55`
                : 'rgba(255,255,255,0.2)',
            }}
            className="active:opacity-80"
          >
            <AppIcon name={isDark ? 'sun' : 'moon'} size={17} color={iconTint} />
          </Pressable>

          <Chip
            elevated={elevated}
            label="Movies"
            onPress={() => router.push('/(tabs)/movies')}
          />
          <Chip
            elevated={elevated}
            label="TV"
            onPress={() => router.push('/(tabs)/tv')}
          />
        </View>
      </View>
    </View>
  );
}
