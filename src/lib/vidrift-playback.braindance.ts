import { apiFetch } from '@/lib/api/client';
import type { VidriftStreamSession } from '@/lib/vidrift-source.client';
import type { ResolvedDirectStream } from '@/lib/vidrift-stream';

export type BraindancePlaybackDirect = ResolvedDirectStream & { resolution: 'direct' };

export type BraindancePlaybackSession = {
  resolution: 'vidrift-session';
  session: VidriftStreamSession;
  subtitles: ResolvedDirectStream['subtitles'];
};

export type BraindancePlayback = BraindancePlaybackDirect | BraindancePlaybackSession;

export async function resolvePlaybackViaBraindance(options: {
  type: 'movie' | 'tv';
  tmdbId: number;
  season: number;
  episode: number;
  referer: string;
  parentHost: string;
}): Promise<BraindancePlayback> {
  return apiFetch<BraindancePlayback>('/streaming/playback', {
    params: {
      type: options.type,
      tmdbId: options.tmdbId,
      season: options.season,
      episode: options.episode,
      referer: options.referer,
      parentHost: options.parentHost,
    },
    timeoutMs: 25000,
    noStore: true,
  });
}