import type { MediaCardModel } from '@netwatch/core';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaRail } from '@/components/media-rail';
import { ScreenState } from '@/components/screen-state';
import { AppIcon } from '@/components/ui/AppIcon';
import { useWatchlist } from '@/context/WatchlistContext';
import {
  fetchPreviewDetails,
  fetchRecommendationsForDetail,
  fetchTvSeasonEpisodes,
  type PreviewDetailData,
  type SeasonEpisodeItem,
} from '@/lib/api/detail';
import { layout } from '@/theme/tokens';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type DetailScreenProps = {
  mediaType: 'movie' | 'tv';
  idParam: string;
};

const windowHeight = Dimensions.get('window').height;

export function DetailScreen({ mediaType, idParam }: DetailScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useNetwatchTheme();
  const { isSaved, toggleWatchlist } = useWatchlist();

  const numId = Number(idParam);
  const validId = Number.isInteger(numId) && numId > 0;

  const [detail, setDetail] = useState<PreviewDetailData | null>(null);
  const [recommendations, setRecommendations] = useState<MediaCardModel[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodesMap, setEpisodesMap] = useState<Record<number, SeasonEpisodeItem[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSeason = useCallback(
    async (seasonNumber: number) => {
      if (mediaType !== 'tv' || !validId) return;
      setLoadingEpisodes(true);
      try {
        const eps = await fetchTvSeasonEpisodes(numId, seasonNumber);
        setEpisodesMap((prev) => ({ ...prev, [seasonNumber]: eps }));
      } catch {
        setEpisodesMap((prev) => ({ ...prev, [seasonNumber]: [] }));
      } finally {
        setLoadingEpisodes(false);
      }
    },
    [mediaType, numId, validId]
  );

  const load = useCallback(
    async (isRefresh = false) => {
      if (!validId) {
        setError('Invalid title ID');
        setLoading(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await fetchPreviewDetails(mediaType, numId);
        setDetail(data);
        const primaryGenreId = data.genres?.[0]?.id;
        const [recs] = await Promise.all([
          fetchRecommendationsForDetail(mediaType, primaryGenreId),
          mediaType === 'tv' ? loadSeason(1) : Promise.resolve(),
        ]);
        setRecommendations(
          recs.filter((r) => !(r.id === numId && r.type === mediaType)).slice(0, 12)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load details');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mediaType, numId, validId, loadSeason]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelectSeason = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    if (!episodesMap[seasonNumber]) {
      void loadSeason(seasonNumber);
    }
  };

  if (!validId) {
    return (
      <ScreenState
        mode="error"
        message="Invalid title link"
        onBack={() => router.back()}
      />
    );
  }

  if (loading && !detail) {
    return <ScreenState mode="loading" message="Loading title details…" />;
  }

  if (error && !detail) {
    return (
      <ScreenState
        mode="error"
        message={error}
        onRetry={() => void load()}
        onBack={() => router.back()}
      />
    );
  }

  if (!detail) {
    return <ScreenState mode="empty" onBack={() => router.back()} />;
  }

  const saved = isSaved(detail.id, detail.type);
  const matchScore =
    detail.rating > 0
      ? Math.min(99, Math.max(50, Math.round(detail.rating * 10)))
      : null;

  const hours = detail.runtime ? Math.floor(detail.runtime / 60) : 0;
  const minutes = detail.runtime ? detail.runtime % 60 : 0;
  const runtimeLabel =
    detail.runtime && detail.runtime > 0
      ? hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`
      : null;

  const totalSeasons = Math.max(1, detail.numberOfSeasons || 1);
  const activeEpisodes = episodesMap[selectedSeason] || [];
  const primaryServer =
    detail.servers?.find((s) => s.isRecommended) || detail.servers?.[0] || null;

  const cardModel: MediaCardModel = {
    id: detail.id,
    type: detail.type,
    title: detail.title,
    meta: `${detail.type === 'tv' ? 'Series' : 'Feature Film'}${
      detail.year ? ` • ${detail.year}` : ''
    }`,
    imageUrl: detail.posterUrl || detail.backdropUrl,
    backdropUrl: detail.backdropUrl || detail.posterUrl,
    rating: detail.rating,
    overview: detail.overview,
    year: detail.year,
  };

  const onPlayPress = (seasonNum = selectedSeason, epNum = 1) => {
    if (detail.type === 'tv') {
      router.push(`/watch/tv/${detail.id}?s=${seasonNum}&e=${epNum}`);
    } else {
      router.push(`/watch/movie/${detail.id}`);
    }
  };

  const onSharePress = async () => {
    try {
      await Share.share({
        title: detail.title,
        message: `Watch ${detail.title} (${detail.year}) on Netwatch!`,
      });
    } catch {
      /* ignore share cancel */
    }
  };

  const heroH = Math.round(windowHeight * 0.48);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 40, gap: 24 }}
      >
        {/* 1. HERO BACKDROP HEADER */}
        <View style={{ width: '100%', height: heroH }}>
          <Image
            source={{ uri: detail.backdropUrl || detail.posterUrl }}
            style={{ width: '100%', height: heroH }}
            contentFit="cover"
          />
          <View
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(14,14,14,0.45)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '58%',
              backgroundColor: colors.heroScrim,
            }}
          />

          {/* Floating Back Button */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: layout.gutter,
              right: layout.gutter,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.68)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.22)',
              }}
              className="active:opacity-85"
            >
              <AppIcon name="back" size={15} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>
                Back
              </Text>
            </Pressable>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(16,185,129,0.22)',
                borderWidth: 1,
                borderColor: 'rgba(52,211,153,0.45)',
              }}
            >
              <AppIcon name="server" size={11} color="#34d399" />
              <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '800' }}>
                {primaryServer ? `${primaryServer.name} Ready` : 'Multi-Source Ready'}
              </Text>
            </View>
          </View>

          {/* Hero Bottom Title & Badges */}
          <View
            style={{
              position: 'absolute',
              left: layout.gutter,
              right: layout.gutter,
              bottom: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 4,
                  backgroundColor: `${colors.primary}30`,
                  borderWidth: 1,
                  borderColor: `${colors.primary}80`,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                  {detail.type === 'tv' ? 'SERIES' : 'FEATURE FILM'}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 4,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                  4K ULTRA HD
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#ffffff',
                letterSpacing: -0.5,
                lineHeight: 33,
              }}
              numberOfLines={2}
            >
              {detail.title}
            </Text>

            {detail.tagline ? (
              <Text
                style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: colors.primary,
                  fontWeight: '600',
                }}
                numberOfLines={1}
              >
                “{detail.tagline}”
              </Text>
            ) : null}

            {/* Metadata Row */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {matchScore ? (
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#34d399' }}>
                  {matchScore}% Match
                </Text>
              ) : null}
              {detail.year ? (
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                  {detail.year}
                </Text>
              ) : null}
              {detail.type === 'tv' ? (
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                  {totalSeasons} {totalSeasons === 1 ? 'Season' : 'Seasons'}
                </Text>
              ) : runtimeLabel ? (
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                  {runtimeLabel}
                </Text>
              ) : null}
              {detail.rating > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <AppIcon name="star" size={13} color="#fbbf24" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#fbbf24' }}>
                    {detail.rating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* 2. PRIMARY ACTION BUTTONS & SYNOPSIS */}
        <View style={{ paddingHorizontal: layout.gutter, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => onPlayPress(selectedSeason, 1)}
              accessibilityRole="button"
              accessibilityLabel="Play"
              style={{
                flex: 1.5,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.primary,
              }}
              className="active:opacity-90"
            >
              <AppIcon name="play" size={16} color={colors.onPrimary} />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '900',
                  color: colors.onPrimary,
                }}
              >
                {detail.type === 'tv' ? `Play S${selectedSeason} E1` : 'Play Feature'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void toggleWatchlist(cardModel)}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove from My List' : 'Add to My List'}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: saved
                  ? `${colors.primary}25`
                  : colors.surfaceContainerHigh,
                borderWidth: 1,
                borderColor: saved ? colors.primary : `${colors.outlineVariant}60`,
              }}
              className="active:opacity-85"
            >
              <AppIcon
                name={saved ? 'check' : 'plus'}
                size={16}
                color={saved ? colors.primary : colors.onSurface}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: saved ? colors.primary : colors.onSurface,
                }}
              >
                {saved ? 'In My List' : 'My List'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void onSharePress()}
              accessibilityRole="button"
              accessibilityLabel="Share"
              style={{
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.surfaceContainerHigh,
                borderWidth: 1,
                borderColor: `${colors.outlineVariant}60`,
              }}
              className="active:opacity-85"
            >
              <AppIcon name="share" size={15} color={colors.onSurface} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: colors.onSurface,
                }}
              >
                Share
              </Text>
            </Pressable>
          </View>

          {/* Genres */}
          {detail.genres && detail.genres.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {detail.genres.map((g) => (
                <View
                  key={g.id}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: colors.surfaceContainerHigh,
                    borderWidth: 1,
                    borderColor: `${colors.outlineVariant}55`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {g.name}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Plot Synopsis */}
          <Text
            style={{
              fontSize: 14,
              lineHeight: 22,
              color: colors.onSurface,
            }}
          >
            {detail.overview || 'No synopsis available for this title yet.'}
          </Text>
        </View>

        {/* 3. TV SEASON & EPISODES PICKER */}
        {detail.type === 'tv' ? (
          <View style={{ gap: 14 }}>
            <View
              style={{
                paddingHorizontal: layout.gutter,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: '800',
                  color: colors.onSurface,
                }}
              >
                Episodes
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.primary,
                }}
              >
                Season {selectedSeason} of {totalSeasons}
              </Text>
            </View>

            {/* Horizontal Season Selector Pills */}
            {totalSeasons > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: layout.gutter,
                  gap: 8,
                }}
              >
                {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(
                  (seasonNum) => {
                    const active = seasonNum === selectedSeason;
                    return (
                      <Pressable
                        key={seasonNum}
                        onPress={() => handleSelectSeason(seasonNum)}
                        accessibilityRole="button"
                        accessibilityLabel={`Season ${seasonNum}`}
                        accessibilityState={{ selected: active }}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 999,
                          backgroundColor: active
                            ? colors.primary
                            : colors.surfaceContainerHigh,
                          borderWidth: 1,
                          borderColor: active
                            ? colors.primary
                            : `${colors.outlineVariant}60`,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: active
                              ? colors.onPrimary
                              : colors.onSurfaceVariant,
                          }}
                        >
                          Season {seasonNum}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </ScrollView>
            ) : null}

            {/* Episode Cards */}
            <View style={{ paddingHorizontal: layout.gutter, gap: 10 }}>
              {loadingEpisodes ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : activeEpisodes.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
                  No episode metadata available for Season {selectedSeason}. Tap Play above to stream directly.
                </Text>
              ) : (
                activeEpisodes.map((ep) => (
                  <Pressable
                    key={ep.id || `${selectedSeason}-${ep.episode_number}`}
                    onPress={() =>
                      onPlayPress(
                        ep.season_number || selectedSeason,
                        ep.episode_number
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Play Episode ${ep.episode_number} ${ep.name}`}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      padding: 10,
                      borderRadius: 12,
                      backgroundColor: colors.surfaceContainer,
                      borderWidth: 1,
                      borderColor: `${colors.outlineVariant}45`,
                    }}
                    className="active:opacity-85"
                  >
                    <View
                      style={{
                        width: 118,
                        height: 68,
                        borderRadius: 8,
                        overflow: 'hidden',
                        backgroundColor: colors.cardPlaceholder,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        source={{
                          uri: ep.stillUrl || detail.backdropUrl || detail.posterUrl,
                        }}
                        style={{ width: 118, height: 68 }}
                        contentFit="cover"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AppIcon
                          name="play"
                          size={12}
                          color="#ffffff"
                          style={{ marginLeft: 1 }}
                        />
                      </View>
                    </View>

                    <View style={{ flex: 1, justifyContent: 'center', gap: 3 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: colors.primary,
                          }}
                        >
                          S{ep.season_number || selectedSeason} • E{ep.episode_number}
                        </Text>
                        {ep.runtime ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.onSurfaceVariant,
                            }}
                          >
                            {ep.runtime}m
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: colors.onSurface,
                        }}
                        numberOfLines={1}
                      >
                        {ep.name || `Episode ${ep.episode_number}`}
                      </Text>
                      {ep.overview ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.onSurfaceVariant,
                            lineHeight: 16,
                          }}
                          numberOfLines={2}
                        >
                          {ep.overview}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        ) : null}

        {/* 4. CAST & CREW RAIL */}
        {detail.cast && detail.cast.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text
              style={{
                paddingHorizontal: layout.gutter,
                fontSize: 18,
                fontWeight: '800',
                color: colors.onSurface,
              }}
            >
              Cast & Crew
            </Text>
            <FlatList
              horizontal
              nestedScrollEnabled
              data={detail.cast}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: layout.gutter,
                gap: 14,
              }}
              renderItem={({ item: member }) => (
                <View style={{ width: 84, alignItems: 'center', gap: 6 }}>
                  {member.profileUrl ? (
                    <Image
                      source={{ uri: member.profileUrl }}
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 34,
                        backgroundColor: colors.cardPlaceholder,
                        borderWidth: 1,
                        borderColor: `${colors.outlineVariant}60`,
                      }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 34,
                        backgroundColor: colors.surfaceContainerHigh,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        {member.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: colors.onSurface,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.onSurfaceVariant,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {member.character}
                  </Text>
                </View>
              )}
            />
          </View>
        ) : null}

        {/* 5. MORE LIKE THIS RECOMMENDATIONS */}
        {recommendations.length > 0 ? (
          <MediaRail
            title="More Like This"
            subtitle="Titles sharing similar genres and audience acclaim"
            items={recommendations}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
