import { apiFetch } from './client';
import { StreamingServerInfo } from '../types';

export interface ResolveStreamParams {
  serverId?: string;
  type: 'movie' | 'tv' | 'anilist';
  tmdbId: number;
  season?: number;
  episode?: number;
}

export interface ResolvedStreamResponse {
  selectedServer: StreamingServerInfo;
  availableServers: StreamingServerInfo[];
}

export const streamingApi = {
  /**
   * Get all registered streaming servers
   */
  async getServers(): Promise<StreamingServerInfo[]> {
    return apiFetch<StreamingServerInfo[]>('/streaming/servers');
  },

  /**
   * Resolve an embed stream URL for a specific movie or TV episode
   */
  async resolveStream(params: ResolveStreamParams): Promise<ResolvedStreamResponse> {
    return apiFetch<ResolvedStreamResponse>('/streaming/resolve', {
      params: {
        serverId: params.serverId,
        type: params.type,
        tmdbId: params.tmdbId,
        season: params.season,
        episode: params.episode,
      },
      noStore: true,
    });
  },
};
