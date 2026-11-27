import { useState } from 'react';
import { PanResponder, View } from 'react-native';

type TimelineScrubberProps = {
  progress: number;
  onScrub: (fraction: number) => void;
};

export function TimelineScrubber({ progress, onScrub }: TimelineScrubberProps) {
  const [barWidth, setBarWidth] = useState(280);

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX } = evt.nativeEvent;
      onScrub(Math.min(1, Math.max(0, locationX / Math.max(1, barWidth))));
    },
    onPanResponderMove: (evt) => {
      const { locationX } = evt.nativeEvent;
      onScrub(Math.min(1, Math.max(0, locationX / Math.max(1, barWidth))));
    },
  });

  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 20) setBarWidth(w);
      }}
      style={{
        height: 20,
        width: '100%',
        justifyContent: 'center',
      }}
      accessibilityRole="adjustable"
      accessibilityLabel="Playback timeline"
      {...pan.panHandlers}
    >
      <View
        style={{
          height: 6,
          width: '100%',
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.24)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 6,
            width: `${clamped * 100}%`,
            borderRadius: 999,
            backgroundColor: '#b0c6ff',
          }}
        />
      </View>
    </View>
  );
}
