import { Text, View } from 'react-native';

type SeekOverlayProps = {
  side: 'left' | 'right' | null;
};

export function SeekOverlay({ side }: SeekOverlayProps) {
  if (!side) return null;

  const label = side === 'left' ? '-10s' : '+10s';

  return (
    <View
      className={`absolute top-0 bottom-0 w-1/2 items-center justify-center ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
      pointerEvents="none"
    >
      <Text className="rounded-md bg-black/60 px-4 py-2 text-lg font-bold text-white">
        {label}
      </Text>
    </View>
  );
}