export interface BuildServerUrlOptions {
  serverId: string;
  type: 'movie' | 'tv' | 'anilist';
  id: number | string;
  season?: number;
  episode?: number;
  brand?: string;
  brandColor?: string;
  font?: string;
}

export function isNativeServer(serverId: string): boolean {
  return serverId === 'native';
}

export function buildServerStreamUrl({
  type,
  id,
  season = 1,
  episode = 1,
  brand = 'Netwatch',
  brandColor = '#b0c6ff',
  font = 'Inter',
}: BuildServerUrlOptions): string {
  // Documented embed parameters: https://vidrift.net/docs#params
  const basePath =
    type === 'tv'
      ? `https://embed.vidrift.net/embed/tv/${id}/${season}/${episode}`
      : `https://embed.vidrift.net/embed/movie/${id}`;

  const params = new URLSearchParams({
    brand,
    brandColor,
    font,
    exit: '1',
    showTitle: '1',
    uiScale: '1.0',
    controlBg: 'solid',
  });

  return `${basePath}?${params.toString()}`;
}

export const buildVidriftEmbedUrl = (options: Omit<BuildServerUrlOptions, 'serverId'>): string =>
  buildServerStreamUrl({ ...options, serverId: 'vidrift' });
