import type { StreamingServerInfo } from '@netwatch/core';
import { ScreenState } from '@/components/screen-state';
import {
  fetchPreviewDetails,
  fetchTvSeasonEpisodes,
  type PreviewDetailData,
  type SeasonEpisodeItem,
} from '@/lib/api/detail';
import {
  fetchMediaProgress,
  updateMediaProgress,
} from '@/lib/api/history';
import { fetchPlaybackSource, type PlaybackSource } from '@/lib/api/stream';
import { useNetwatchTheme } from '@/theme/ThemeContext';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parsePositiveInt, parseWatchMediaType } from './watch.helper';
import { WATCH_STRINGS } from './strings';
import { WatchEmbedPlayer } from './WatchEmbedPlayer';
import { WatchPlayer } from './WatchPlayer';

type WatchScreenProps = {
  typeParam: string;
  idParam: string;
  seasonParam?: string;
  episodeParam?: string;
};

export function WatchScreen({
  typeParam,
  idParam,
  seasonParam,
  episodeParam,
}: WatchScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useNetwatchTheme();

  const mediaType = parseWatchMediaType(typeParam);
  const mediaId = parsePositiveInt(idParam);
  const [season, setSeason] = useState<number>(() => parsePositiveInt(seasonParam) ?? 1);
  const [episode, setEpisode] = useState<number>(() => parsePositiveInt(episodeParam) ?? 1);
  const [preferredServerId, setPreferredServerId] = useState<string>('native');

  const [source, setSource] = useState<PlaybackSource | null>(null);
  const [detail, setDetail] = useState<PreviewDetailData | null>(null);
  const [episodes, setEpisodes] = useState<SeasonEpisodeItem[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(true);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  const lastSaveRef = useRef<number>(0);

  const loadMetadata = useCallback(async () => {
    if (!mediaType || mediaId == null) return;
    try {
      const [det, eps] = await Promise.all([
        fetchPreviewDetails(mediaType, mediaId).catch(() => null),
        mediaType === 'tv'
          ? fetchTvSeasonEpisodes(mediaId, season).catch(() => [])
          : Promise.resolve([]),
      ]);
      if (det) setDetail(det);
      setEpisodes(eps);
    } catch {
      /* optional metadata */
    }
  }, [mediaType, mediaId, season]);

  const load = useCallback(async () => {
    if (!mediaType || mediaId == null) {
      setLoadError('Invalid title');
      setLoadingStream(false);
      return;
    }
    setLoadingStream(true);
    setLoadError(null);
    setSource(null);
    try {
      const [resolvedSource, resumeSec] = await Promise.all([
        fetchPlaybackSource(
          mediaType,
          mediaId,
          season,
          episode,
          preferredServerId
        ),
        fetchMediaProgress(mediaId, mediaType, season, episode),
      ]);
      setSource(resolvedSource);
      setStartTime(resumeSec);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Stream failed');
    } finally {
      setLoadingStream(false);
    }
  }, [mediaType, mediaId, season, episode, preferredServerId]);

  useEffect(() => {
    void load();
    void loadMetadata();
  }, [load, loadMetadata]);

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (!mediaType || mediaId == null || duration <= 0) return;
      const now = Date.now();
      if (now - lastSaveRef.current < 12_000) return;
      lastSaveRef.current = now;
      void updateMediaProgress(mediaId, {
        event: 'timeupdate',
        currentTime,
        duration,
        mediaType,
        season: mediaType === 'tv' ? season : null,
        episode: mediaType === 'tv' ? episode : null,
      });
    },
    [mediaType, mediaId, season, episode]
  );

  const handleEnded = useCallback(() => {
    if (mediaType === 'tv') {
      const nextEp = episodes.find((e) => e.episode_number === episode + 1);
      if (nextEp) {
        setEpisode(nextEp.episode_number);
        return;
      }
    }
  }, [mediaType, episodes, episode]);

  if (!mediaType || mediaId == null) {
    return (
      <ScreenState
        mode="error"
        message="Invalid watch link"
        onBack={() => router.back()}
      />
    );
  }

  if (loadingStream) {
    return <ScreenState mode="loading" message={WATCH_STRINGS.loading} />;
  }

  if (loadError || !source) {
    return (
      <ScreenState
        mode="error"
        message={loadError || 'No stream'}
        onRetry={() => void load()}
        onBack={() => router.back()}
      />
    );
  }

  const title = detail?.title || `Netwatch #${mediaId}`;
  const subtitle = mediaType === 'tv' ? `S${season} • E${episode}` : detail?.year;
  const availableServers: StreamingServerInfo[] = [
    {
      id: 'native',
      name: 'Netwatch Direct HLS',
      embedUrl: '',
      quality: 'Adaptive HLS • Ad-Free',
      isRecommended: true,
    },
    ...(source.servers || []).filter((s) => s.id !== 'native'),
  ];

  const activeServerId =
    source.mode === 'direct' ? 'native' : source.serverId;

  const qualityLabel =
    source.mode === 'direct'
      ? source.maxHeight
        ? `Direct HLS • ${source.maxHeight}p`
        : 'Direct HLS • Ad-Free'
      : source.serverName;

  const totalSeasons = Math.max(1, detail?.numberOfSeasons || 1);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {source.mode === 'embed' ? (
        <WatchEmbedPlayer
          embedUrl={source.url}
          title={title}
          subtitle={subtitle}
          serverName={source.serverName}
          onOpenSources={() => setSourcesSheetOpen(true)}
          onOpenDetails={() => router.push(`/${mediaType}/${mediaId}`)}
        />
      ) : (
        <WatchPlayer
          streamUrl={source.url}
          title={title}
          subtitle={subtitle}
          qualityLabel={qualityLabel}
          startTime={startTime}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onOpenSources={() => setSourcesSheetOpen(true)}
          onOpenDetails={() => router.push(`/${mediaType}/${mediaId}`)}
        />
      )}

      {/* Server & Episode Switcher Bottom Sheet Modal */}
      <Modal
        visible={sourcesSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSourcesSheetOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.68)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              maxHeight: '78%',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              backgroundColor: colors.surfaceContainer,
              borderTopWidth: 1,
              borderColor: `${colors.outlineVariant}60`,
              paddingTop: 16,
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: 16,
              gap: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.onSurface,
                }}
              >
                Stream Sources & Episodes
              </Text>
              <Pressable
                onPress={() => setSourcesSheetOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close source menu"
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: colors.surfaceContainerHigh,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: colors.onSurface,
                  }}
                >
                  Done
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 12 }}>
              {/* Server List */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: colors.onSurfaceVariant,
                    letterSpacing: 0.6,
                  }}
                >
                  SELECT STREAM SERVER
                </Text>
                {availableServers.map((srv) => {
                  const active = srv.id === activeServerId;
                  return (
                    <Pressable
                      key={srv.id}
                      onPress={() => {
                        setSourcesSheetOpen(false);
                        setPreferredServerId(srv.id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Switch to ${srv.name}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: active
                          ? `${colors.primary}22`
                          : colors.surfaceContainerHigh,
                        borderWidth: 1,
                        borderColor: active
                          ? colors.primary
                          : `${colors.outlineVariant}55`,
                      }}
                    >
                      <View style={{ gap: 2 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '800',
                            color: active ? colors.primary : colors.onSurface,
                          }}
                        >
                          {srv.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.onSurfaceVariant,
                          }}
                        >
                          {srv.quality || 'Adaptive HD'}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: active ? colors.primary : colors.onSurfaceVariant,
                        }}
                      >
                        {active ? '● Active' : 'Select'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* TV Season & Episode Selector */}
              {mediaType === 'tv' ? (
                <View style={{ gap: 10 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: colors.onSurfaceVariant,
                      letterSpacing: 0.6,
                    }}
                  >
                    SEASON & EPISODE
                  </Text>

                  {totalSeasons > 1 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(
                        (sNum) => {
                          const active = sNum === season;
                          return (
                            <Pressable
                              key={sNum}
                              onPress={() => {
                                setSeason(sNum);
                                setEpisode(1);
                              }}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 7,
                                borderRadius: 999,
                                backgroundColor: active
                                  ? colors.primary
                                  : colors.surfaceContainerHigh,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '800',
                                  color: active
                                    ? colors.onPrimary
                                    : colors.onSurface,
                                }}
                              >
                                Season {sNum}
                              </Text>
                            </Pressable>
                          );
                        }
                      )}
                    </ScrollView>
                  ) : null}

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(episodes.length > 0
                      ? episodes
                      : Array.from({ length: 12 }, (_, idx) => ({
                          id: idx + 1,
                          episode_number: idx + 1,
                          season_number: season,
                          name: `Episode ${idx + 1}`,
                          overview: '',
                        }))
                    ).map((ep) => {
                      const active = ep.episode_number === episode;
                      return (
                        <Pressable
                          key={ep.id || ep.episode_number}
                          onPress={() => {
                            setSourcesSheetOpen(false);
                            setEpisode(ep.episode_number);
                          }}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: active
                              ? colors.primary
                              : colors.surfaceContainerHigh,
                            borderWidth: 1,
                            borderColor: active
                              ? colors.primary
                              : `${colors.outlineVariant}55`,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '800',
                              color: active
                                ? colors.onPrimary
                                : colors.onSurface,
                            }}
                          >
                            E{ep.episode_number}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
