export type EmbedProvider = 'animeembed' | 'anisrc' | 'aniembed' | 'vidrift';

export interface StreamConfig {
  anilistId: number;
  malId?: number | null;
  useMalId?: boolean;
  episode: number;
  track: 'sub' | 'dub';
  startSeconds?: number;
  autoplay?: boolean;
  autoNext?: boolean;
  accentHex?: string;
  customTitle?: string;
  autoSkip?: boolean;
  /** VidRift failover only — TMDB id resolved from title search. */
  tmdbId?: number | null;
  tmdbType?: 'movie' | 'tv';
}

export const FAILOVER_ORDER: EmbedProvider[] = ['animeembed', 'anisrc', 'aniembed'];

/**
 * Scripts and media stay allowed. Top-level navigations and popups stay blocked,
 * so an embed ad cannot leave this tab or open another one.
 */
export const EMBED_SANDBOX =
  'allow-scripts allow-same-origin allow-presentation allow-fullscreen allow-forms';

function cleanHex(value: string | undefined, fallback: string): string {
  const stripped = (value ?? '').replace(/^#/, '').trim();
  return /^[0-9a-fA-F]{6}$/.test(stripped) ? stripped.toLowerCase() : fallback;
}

export function buildEmbedUrl(provider: EmbedProvider, cfg: StreamConfig): string | null {
  const ep = Math.max(1, Math.floor(cfg.episode));
  const start = Math.max(0, Math.floor(cfg.startSeconds ?? 0));
  const canUseMal = Boolean(cfg.useMalId && cfg.malId && cfg.malId > 0);

  if (provider === 'animeembed') {
    const path = canUseMal
      ? `/embed/mal/${cfg.malId}/${ep}`
      : `/embed/ani/${cfg.anilistId}/${ep}`;

    const params = new URLSearchParams();
    if (cfg.track === 'dub') params.set('track', 'dub');
    if (cfg.autoplay) params.set('autoPlay', '1');
    if (start > 0) params.set('start', String(Math.min(604800, start)));
    if (cfg.autoNext) params.set('autoNext', '1');
    if (cfg.autoSkip === false) params.set('autoSkip', '0');

    const accent = cleanHex(cfg.accentHex, 'b0c6ff');
    if (accent !== 'b0c6ff') params.set('accent', accent);
    if (cfg.customTitle?.trim()) params.set('title', cfg.customTitle.trim().slice(0, 100));

    const qs = params.toString();
    return `https://animeembed.com${path}${qs ? `?${qs}` : ''}`;
  }

  if (provider === 'anisrc') {
    const idToken = canUseMal ? `mal${cfg.malId}` : String(cfg.anilistId);
    const epToken = cfg.track === 'dub' ? `${ep}-dub` : String(ep);

    const params = new URLSearchParams();
    if (cfg.autoplay) params.set('autoplay', '1');
    if (cfg.autoNext) params.set('autonext', '1');
    if (start > 0) params.set('startAt', String(start));

    const qs = params.toString();
    return `https://anisrc.ru/embed/anime/${idToken}/${epToken}${qs ? `?${qs}` : ''}`;
  }

  if (provider === 'aniembed') {
    const params = new URLSearchParams();
    if (cfg.track === 'dub') params.set('lang', 'dub');
    if (cfg.autoplay) params.set('autoplay', '1');
    if (start > 0) params.set('t', String(start));

    const qs = params.toString();
    return `https://aniembed.se/e/${cfg.anilistId}/${ep}${qs ? `?${qs}` : ''}`;
  }

  if (provider === 'vidrift') {
    if (!cfg.tmdbId) return null;
    const type = cfg.tmdbType === 'movie' ? 'movie' : 'tv';
    const params = new URLSearchParams({
      exit: '0',
      showTitle: '1',
      autoPlay: cfg.autoplay ? '1' : '0',
    });
    if (start > 0) params.set('startAt', String(start));
    if (type === 'tv') {
      params.set('season', '1');
      params.set('episode', String(ep));
    }
    return `https://embed.vidrift.net/embed/${type}/${cfg.tmdbId}?${params.toString()}`;
  }

  return null;
}