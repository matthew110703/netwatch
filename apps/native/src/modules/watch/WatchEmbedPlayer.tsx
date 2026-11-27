import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { AppIcon } from '@/components/ui/AppIcon';
import { WATCH_STRINGS } from './strings';

type WatchEmbedPlayerProps = {
  embedUrl: string;
  title?: string;
  subtitle?: string;
  serverName?: string;
  onOpenSources?: () => void;
  onOpenDetails?: () => void;
};

export function WatchEmbedPlayer({
  embedUrl,
  title = 'Netwatch Stream',
  subtitle,
  serverName = 'Embed Relay',
  onOpenSources,
  onOpenDetails,
}: WatchEmbedPlayerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      <View
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 10,
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
            gap: 5,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: 'rgba(0,0,0,0.72)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
          }}
          className="active:opacity-80"
        >
          <AppIcon name="back" size={14} color="#ffffff" />
          <Text className="text-white font-bold text-xs">{WATCH_STRINGS.back}</Text>
        </Pressable>

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}
            numberOfLines={1}
          >
            {title} {subtitle ? `• ${subtitle}` : ''}
          </Text>
          <Text style={{ color: '#b0c6ff', fontSize: 10, fontWeight: '700' }}>
            {serverName}
          </Text>
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
                backgroundColor: 'rgba(0,0,0,0.72)',
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
                backgroundColor: 'rgba(0,0,0,0.72)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <AppIcon name="info" size={16} color="#ffffff" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <WebView
        source={{ uri: embedUrl }}
        style={{ flex: 1, backgroundColor: '#000' }}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
