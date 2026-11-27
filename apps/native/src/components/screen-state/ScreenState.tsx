import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type ScreenStateProps = {
  mode: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function ScreenState({ mode, message, onRetry, onBack, actionLabel, onAction }: ScreenStateProps) {
  const { colors } = useNetwatchTheme();

  if (mode === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message ? (
          <Text style={{ marginTop: 12, fontSize: 14, color: colors.onSurfaceVariant }}>{message}</Text>
        ) : null}
      </View>
    );
  }

  const label =
    message ||
    (mode === 'empty' ? 'Nothing to show yet.' : 'Something went wrong.');

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: 24,
      }}
    >
      <Text style={{ textAlign: 'center', fontSize: 16, color: colors.onSurfaceVariant }}>{label}</Text>
      <View style={{ marginTop: 24, flexDirection: 'row', gap: 12 }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={{
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: colors.surfaceContainerHigh,
            }}
            accessibilityRole="button"
            className="active:opacity-85"
          >
            <Text style={{ color: colors.onSurface, fontWeight: '600' }}>Back</Text>
          </Pressable>
        ) : null}
        {onAction ? (
          <Pressable
            onPress={onAction}
            style={{
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: colors.primary,
            }}
            accessibilityRole="button"
            className="active:opacity-85"
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{actionLabel ?? 'Browse Home'}</Text>
          </Pressable>
        ) : null}
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={{
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: colors.primary,
            }}
            accessibilityRole="button"
            className="active:opacity-85"
          >
            <Text style={{ fontWeight: '700', color: colors.onPrimary }}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}