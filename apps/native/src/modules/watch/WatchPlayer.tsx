import {
  PlayPauseButton,
  SeekOverlay,
  TimelineScrubber,
} from '@/components/player-chrome';
import { AppIcon } from '@/components/ui/AppIcon';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WATCH_STRINGS } from './strings';

const HIDE_MS = 3800;
const SEEK_DELTA_SEC = 10;

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

type WatchPlayerProps = {
  streamUrl: string;
  title?: string;
  subtitle?: string;
  qualityLabel?: string;
  startTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onOpenSources?: () => void;
  onOpenDetails?: () => void;
};

export function WatchPlayer({
  streamUrl,
  title = 'Netwatch Stream',
  subtitle,
  qualityLabel = 'Direct HLS • Ad-Free',
  startTime = 0,
  onTimeUpdate,
  onEnded,
  onOpenSources,
  onOpenDetails,
}: WatchPlayerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);
  const [seekRipple, setSeekRipple] = useState<'left' | 'right' | null>(null);
  const [tick, setTick] = useState(0);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ t: number; x: number }>({ t: 0, x: 0 });
  const seekedInitialRef = useRef(false);
  const endedFiredRef = useRef(false);
  const surfaceWidth = Dimensions.get('window').width;

  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    seekedInitialRef.current = false;
    endedFiredRef.current = false;
  }, [streamUrl]);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((n) => n + 1);
      const dur = player.duration || 0;
      const cur = player.currentTime || 0;
      if (
        !seekedInitialRef.current &&
        startTime > 5 &&
        dur > startTime + 5
      ) {
        seekedInitialRef.current = true;
        player.currentTime = startTime;
      }
      if (dur > 0 && cur > 0) {
        onTimeUpdate?.(cur, dur);
        if (!endedFiredRef.current && dur - cur <= 1.2 && cur > 10) {
          endedFiredRef.current = true;
          onEnded?.();
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [player, startTime, onTimeUpdate, onEnded]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (player.playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), HIDE_MS);
    }
  }, [player.playing]);

  const toggleChrome = useCallback(() => {
    setShowControls((v) => {
      const next = !v;
      if (next) scheduleHide();
      return next;
    });
  }, [scheduleHide]);

  const seekBy = useCallback(
    (delta: number, side: 'left' | 'right') => {
      const duration = player.duration || 0;
      const next = Math.min(duration, Math.max(0, player.currentTime + delta));
      player.currentTime = next;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSeekRipple(side);
      setTimeout(() => setSeekRipple(null), 400);
      setShowControls(true);
      scheduleHide();
    },
    [player, scheduleHide]
  );

  const onSurfacePress = (x: number) => {
    const now = Date.now();
    const prev = lastTap.current;
    if (now - prev.t < 320) {
      const side = x < surfaceWidth / 2 ? 'left' : 'right';
      seekBy(side === 'left' ? -SEEK_DELTA_SEC : SEEK_DELTA_SEC, side);
      lastTap.current = { t: 0, x: 0 };
      return;
    }
    lastTap.current = { t: now, x };
    toggleChrome();
  };

  const duration = player.duration || 0;
  const currentTime = player.currentTime || 0;
  const progress = duration > 0 ? currentTime / duration : 0;
  void tick;

  return (
    <View className="flex-1 bg-black">
      <Pressable
        className="flex-1"
        onPress={(e) => onSurfacePress(e.nativeEvent.locationX)}
        accessibilityRole="button"
        accessibilityLabel="Video surface"
      >
        <VideoView
          player={player}
          style={{ flex: 1 }}
          contentFit="contain"
          nativeControls={false}
        />
        <SeekOverlay side={seekRipple} />
      </Pressable>

      {/* Top Controls Header */}
      {showControls ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 10,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Exit player"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.68)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
            className="active:opacity-80"
          >
            <AppIcon name="back" size={15} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
              {WATCH_STRINGS.back}
            </Text>
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ color: '#b0c6ff', fontSize: 11, fontWeight: '700' }}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {onOpenSources ? (
              <Pressable
                onPress={onOpenSources}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Switch source"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.68)',
                  borderWidth: 1,
                  borderColor: 'rgba(176,198,255,0.45)',
                }}
              >
                <AppIcon name="server" size={13} color="#b0c6ff" />
                <Text style={{ color: '#b0c6ff', fontSize: 11, fontWeight: '800' }}>
                  Source
                </Text>
              </Pressable>
            ) : null}
            {onOpenDetails ? (
              <Pressable
                onPress={onOpenDetails}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Title info"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.68)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <AppIcon name="info" size={16} color="#ffffff" />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Bottom Scrubber & Transport Controls */}
      {showControls ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + 16,
            gap: 10,
            padding: 14,
            borderRadius: 16,
            backgroundColor: 'rgba(14,14,14,0.82)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
          }}
        >
          <TimelineScrubber
            progress={progress}
            onScrub={(fraction) => {
              if (duration > 0) {
                player.currentTime = fraction * duration;
              }
              setShowControls(true);
              scheduleHide();
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ gap: 2 }}>
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                {formatClock(currentTime)} / {formatClock(duration)}
              </Text>
              <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '700' }}>
                ● {qualityLabel}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => seekBy(-SEEK_DELTA_SEC, 'left')}
                accessibilityRole="button"
                accessibilityLabel="Rewind 10 seconds"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                }}
              >
                <AppIcon name="rewind-10" size={13} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                  10s
                </Text>
              </Pressable>

              <PlayPauseButton
                isPlaying={player.playing}
                onToggle={() => {
                  if (player.playing) {
                    player.pause();
                  } else {
                    player.play();
                  }
                  scheduleHide();
                }}
              />

              <Pressable
                onPress={() => seekBy(SEEK_DELTA_SEC, 'right')}
                accessibilityRole="button"
                accessibilityLabel="Forward 10 seconds"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                  10s
                </Text>
                <AppIcon name="forward-10" size={13} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
