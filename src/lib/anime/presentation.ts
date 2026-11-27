const FORMAT_LABEL: Record<string, string> = {
  TV: 'Series',
  TV_SHORT: 'Short',
  MOVIE: 'Film',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
};

export function animeFormatLabel(format: string | null | undefined): string {
  if (!format) return 'Anime';
  return FORMAT_LABEL[format] ?? 'Anime';
}

/** AniList descriptions arrive as HTML with entities. Catalog copy needs plain text. */
export function plainSynopsis(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const EPISODE_PAGE_SIZE = 24;

export interface EpisodeWindow {
  start: number;
  end: number;
  label: string;
}

export function episodeWindows(total: number, pageSize = EPISODE_PAGE_SIZE): EpisodeWindow[] {
  const count = Math.max(0, Math.floor(total));
  if (count === 0) return [];
  const windows: EpisodeWindow[] = [];
  for (let start = 1; start <= count; start += pageSize) {
    const end = Math.min(count, start + pageSize - 1);
    windows.push({ start, end, label: start === end ? `Episode ${start}` : `${start}–${end}` });
  }
  return windows;
}

export function windowForEpisode(episode: number, total: number): EpisodeWindow {
  const windows = episodeWindows(total);
  return (
    windows.find((window) => episode >= window.start && episode <= window.end) ??
    windows[0] ?? { start: 1, end: 1, label: 'Episode 1' }
  );
}