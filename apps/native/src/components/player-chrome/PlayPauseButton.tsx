import { Pressable, Text } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';

type PlayPauseButtonProps = {
  isPlaying: boolean;
  onToggle: () => void;
};

export function PlayPauseButton({ isPlaying, onToggle }: PlayPauseButtonProps) {
  const label = isPlaying ? 'Pause' : 'Play';

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.22)',
      }}
      className="active:opacity-80"
    >
      <AppIcon name={isPlaying ? 'pause' : 'play'} size={15} color="#ffffff" />
      <Text className="text-sm font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
