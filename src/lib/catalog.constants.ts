export const REGIONAL_CHART_DISCOVER_QUERY = {
  with_watch_monetization_types: 'flatrate|free|ads|rent|buy',
  sort_by: 'popularity.desc',
  'vote_count.gte': 50,
} as const;

export const LANGUAGE_RAIL_CONFIG = [
  { code: 'hi', label: 'Hindi' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
] as const;

export type LanguageRailCode = (typeof LANGUAGE_RAIL_CONFIG)[number]['code'];