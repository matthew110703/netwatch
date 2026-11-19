import { NextRequest, NextResponse } from 'next/server';
import { moviesApi, tvApi } from '@/lib/api';

interface SubtitleTrackItem {
  id: string;
  label: string;
  lang: string;
  url: string;
  format: 'vtt' | 'srt';
  source: string;
  upstreamUrl: string;
}

interface StremioSubtitleEntry {
  id?: string;
  url?: string;
  lang?: string;
  movieReleaseName?: string;
  subtitleFileName?: string;
}

interface RawVidriftSubtitle {
  label?: string;
  lang?: string;
  code?: string;
  url?: string;
}

const ALLOWED_SUBTITLE_HOSTS = new Set([
  'subs.wyzie.ru',
  'sub.wyzie.ru',
  'wyzie.ru',
  'embed.vidrift.net',
  'cdn.vidrift.net',
  'opensubtitles-v3.strem.io',
  'strem.io',
  'dl.opensubtitles.org',
  'rest.opensubtitles.org',
  'opensubtitles.org',
]);

const LANG_ALIAS_TO_ISO1: Record<string, string> = {
  en: 'en',
  eng: 'en',
  english: 'en',
  es: 'es',
  spa: 'es',
  spanish: 'es',
  fr: 'fr',
  fre: 'fr',
  fra: 'fr',
  french: 'fr',
  de: 'de',
  ger: 'de',
  deu: 'de',
  german: 'de',
  it: 'it',
  ita: 'it',
  italian: 'it',
  ja: 'ja',
  jpn: 'ja',
  japanese: 'ja',
  ko: 'ko',
  kor: 'ko',
  korean: 'ko',
  pt: 'pt',
  por: 'pt',
  pob: 'pt',
  portuguese: 'pt',
  ru: 'ru',
  rus: 'ru',
  russian: 'ru',
  zh: 'zh',
  chi: 'zh',
  zho: 'zh',
  zht: 'zh',
  chinese: 'zh',
  hi: 'hi',
  hin: 'hi',
  hindi: 'hi',
  ar: 'ar',
  ara: 'ar',
  arabic: 'ar',
  nl: 'nl',
  dut: 'nl',
  nld: 'nl',
  dutch: 'nl',
  pl: 'pl',
  pol: 'pl',
  polish: 'pl',
  tr: 'tr',
  tur: 'tr',
  turkish: 'tr',
  sv: 'sv',
  swe: 'sv',
  swedish: 'sv',
};

const ISO1_TO_DISPLAY: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  hi: 'Hindi',
  ar: 'Arabic',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  sv: 'Swedish',
};

function normalizeLangCode(raw?: string): string {
  if (!raw) return 'en';
  const cleaned = raw.trim().toLowerCase().split(/[-_]/)[0];
  return LANG_ALIAS_TO_ISO1[cleaned] || cleaned.slice(0, 10) || 'en';
}

function getLanguageDisplayName(code: string): string {
  return ISO1_TO_DISPLAY[code] || code.toUpperCase();
}

function isAllowedSubtitleUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (
      ALLOWED_SUBTITLE_HOSTS.has(host) ||
      host.endsWith('.vidrift.net') ||
      host.endsWith('.strem.io') ||
      host.endsWith('.opensubtitles.org') ||
      host.endsWith('.wyzie.ru')
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchSubtitleWithSafeRedirects(initialUrl: URL): Promise<Response> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= 2; hop++) {
    const resp = await fetch(currentUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Netwatch/1.0',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'manual',
    });

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location');
      if (!location || hop === 2) {
        throw new Error('Blocked unsafe subtitle redirect');
      }
      const nextParsed = new URL(location, currentUrl);
      const allowedNext = isAllowedSubtitleUrl(nextParsed.toString());
      if (!allowedNext) {
        throw new Error('Redirected subtitle host is not allowlisted');
      }
      currentUrl = allowedNext;
      continue;
    }

    return resp;
  }

  throw new Error('Too many redirects');
}

function convertSrtToWebVtt(raw: string): string {
  let text = raw.replace(/^\uFEFF/, '');
  if (text.trim().startsWith('WEBVTT')) {
    return text;
  }
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(^|\s)(\d):(\d{2}:\d{2}),(\d{3})/gm, '$10$2:$3.$4')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${text}`;
}

async function fetchOpenSubtitlesTracks(
  type: 'movie' | 'tv',
  tmdbId: number,
  season: number,
  episode: number,
  targetLang: string
): Promise<SubtitleTrackItem[]> {
  try {
    let imdbId: string | null | undefined;
    if (type === 'movie') {
      const movie = await moviesApi.getMovieDetails(tmdbId).catch(() => null);
      imdbId = movie?.imdb_id;
    } else {
      const tv = await tvApi
        .getTvDetails(tmdbId, { append_to_response: 'external_ids' })
        .catch(() => null);
      imdbId = tv?.external_ids?.imdb_id;
    }

    if (!imdbId || !imdbId.startsWith('tt')) {
      return [];
    }

    const endpoint =
      type === 'tv'
        ? `https://opensubtitles-v3.strem.io/subtitles/series/${encodeURIComponent(imdbId)}:${season}:${episode}.json`
        : `https://opensubtitles-v3.strem.io/subtitles/movie/${encodeURIComponent(imdbId)}.json`;

    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Netwatch/1.0',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];
    const json = (await res.json()) as { subtitles?: StremioSubtitleEntry[] };
    const entries = Array.isArray(json.subtitles) ? json.subtitles : [];

    const tracks: SubtitleTrackItem[] = [];
    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx];
      if (!entry.url || !isAllowedSubtitleUrl(entry.url)) continue;

      const normLang = normalizeLangCode(entry.lang);
      if (targetLang !== 'all' && normLang !== targetLang) continue;

      const rawName = (entry.movieReleaseName || entry.subtitleFileName || '')
        .replace(/\.(srt|vtt)$/i, '')
        .replace(/[._]+/g, ' ')
        .trim();
      const langDisplay = getLanguageDisplayName(normLang);
      const suffix =
        rawName && rawName.toLowerCase() !== langDisplay.toLowerCase()
          ? ` — ${rawName.slice(0, 44)}`
          : '';

      tracks.push({
        id: `os-${entry.id || idx}`,
        label: `${langDisplay}${suffix}`,
        lang: normLang,
        url: `/api/subtitles?url=${encodeURIComponent(entry.url)}`,
        format: 'vtt',
        source: 'OpenSubtitles',
        upstreamUrl: entry.url,
      });
    }

    return tracks;
  } catch {
    return [];
  }
}

async function fetchVidRiftTracks(
  type: 'movie' | 'tv',
  tmdbId: number,
  season: number,
  episode: number,
  targetLang: string
): Promise<SubtitleTrackItem[]> {
  try {
    const embedUrl =
      type === 'tv'
        ? `https://embed.vidrift.net/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://embed.vidrift.net/embed/movie/${tmdbId}`;

    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];
    const html = await res.text();
    const subsMatch = html.match(/var subtitleTracks = (\[[\s\S]*?\]);/);
    if (!subsMatch?.[1]) return [];

    const rawSubs = JSON.parse(subsMatch[1]) as RawVidriftSubtitle[];
    const tracks: SubtitleTrackItem[] = [];

    rawSubs.forEach((s, idx) => {
      if (!s.url) return;
      const absoluteUrl = s.url.startsWith('http')
        ? s.url
        : `https://embed.vidrift.net${s.url.startsWith('/') ? s.url : `/${s.url}`}`;

      if (!isAllowedSubtitleUrl(absoluteUrl)) return;

      const normLang = normalizeLangCode(s.code || s.lang || s.label);
      if (targetLang !== 'all' && normLang !== targetLang) return;

      tracks.push({
        id: `vidrift-${idx}`,
        label: s.label || getLanguageDisplayName(normLang),
        lang: normLang,
        url: `/api/subtitles?url=${encodeURIComponent(absoluteUrl)}`,
        format: 'vtt',
        source: 'VidRift',
        upstreamUrl: absoluteUrl,
      });
    });

    return tracks;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const urlToProxy = searchParams.get('url');

    // 1. SSRF-safe Subtitle Proxy & SRT -> WebVTT converter
    if (urlToProxy) {
      const safeUrl = isAllowedSubtitleUrl(urlToProxy);
      if (!safeUrl) {
        return new NextResponse('Forbidden subtitle host', { status: 403 });
      }

      try {
        const resp = await fetchSubtitleWithSafeRedirects(safeUrl);
        if (!resp.ok) {
          return new NextResponse('Failed to fetch upstream subtitle', { status: 502 });
        }
        const rawText = await resp.text();
        const vttText = convertSrtToWebVtt(rawText);

        return new NextResponse(vttText, {
          headers: {
            'Content-Type': 'text/vtt; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upstream fetch failed';
        return new NextResponse(`Subtitle proxy error: ${message}`, { status: 502 });
      }
    }

    // 2. Multi-Source Subtitle Search
    const tmdbId = Number(searchParams.get('tmdbId'));
    const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
    const season = Math.max(1, Number(searchParams.get('season')) || 1);
    const episode = Math.max(1, Number(searchParams.get('episode')) || 1);
    const rawLang = (searchParams.get('language') || 'en').trim().toLowerCase();
    const targetLang = rawLang === 'all' ? 'all' : normalizeLangCode(rawLang);
    const query = (searchParams.get('query') || '').trim().toLowerCase();

    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid tmdbId is required', subtitles: [] },
        { status: 400 }
      );
    }

    const [vidriftTracks, openSubsTracks] = await Promise.all([
      fetchVidRiftTracks(type, tmdbId, season, episode, targetLang),
      fetchOpenSubtitlesTracks(type, tmdbId, season, episode, targetLang),
    ]);

    const seenUrls = new Set<string>();
    const combined: SubtitleTrackItem[] = [];

    for (const item of [...vidriftTracks, ...openSubsTracks]) {
      const key = item.upstreamUrl.toLowerCase();
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);
      combined.push(item);
    }

    combined.sort((a, b) => {
      if (a.lang === 'en' && b.lang !== 'en') return -1;
      if (a.lang !== 'en' && b.lang === 'en') return 1;
      if (a.lang !== b.lang) return a.lang.localeCompare(b.lang);
      if (a.source !== b.source) return a.source === 'VidRift' ? -1 : 1;
      return 0;
    });

    const filteredByQuery = query
      ? combined.filter(
          (r) =>
            r.label.toLowerCase().includes(query) ||
            r.lang.toLowerCase().includes(query) ||
            getLanguageDisplayName(r.lang).toLowerCase().includes(query) ||
            r.source.toLowerCase().includes(query)
        )
      : combined;

    // Balance languages when targetLang === 'all' so one language doesn't crowd out others
    const capped: SubtitleTrackItem[] = [];
    const perLangCounts = new Map<string, number>();
    const maxPerLang = targetLang === 'all' ? 8 : 40;

    for (const item of filteredByQuery) {
      const count = perLangCounts.get(item.lang) ?? 0;
      if (count >= maxPerLang) continue;
      perLangCounts.set(item.lang, count + 1);
      capped.push(item);
      if (capped.length >= 60) break;
    }

    const publicSubtitles = capped.map((item) => ({
      id: item.id,
      label: item.label,
      lang: item.lang,
      url: item.url,
      format: item.format,
      source: item.source,
    }));

    return NextResponse.json({
      success: true,
      subtitles: publicSubtitles,
      total: publicSubtitles.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Subtitle search failure';
    return NextResponse.json({ success: false, error: message, subtitles: [] }, { status: 500 });
  }
}
