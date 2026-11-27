export type NetwatchThemeName = 'luminous' | 'obsidian';

export type NetwatchThemeColors = {
  surface: string;
  surfaceLowest: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outlineVariant: string;
  primary: string;
  onPrimary: string;
  emerald: string;
  amber: string;
  danger: string;
  heroScrim: string;
  cardPlaceholder: string;
  rankStroke: string;
  rankFill: string;
};

export const THEME_STORAGE_KEY = 'netwatch-theme';

export const layout = {
  gutter: 16,
  railGap: 10,
  sectionGap: 26,
  posterWidth: 134,
  posterRadius: 10,
  backdropWidth: 230,
  backdropAspect: 9 / 16,
  heroHeightRatio: 0.56,
  rankedNumeralSize: 68,
} as const;

export const obsidianColors: NetwatchThemeColors = {
  surface: '#131313',
  surfaceLowest: '#0e0e0e',
  surfaceContainer: '#1c1b1b',
  surfaceContainerHigh: '#262626',
  surfaceContainerHighest: '#323232',
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#c2c6d7',
  outlineVariant: '#424654',
  primary: '#b0c6ff',
  onPrimary: '#002d6e',
  emerald: '#34d399',
  amber: '#fbbf24',
  danger: '#ef4444',
  heroScrim: 'rgba(19,19,19,0.78)',
  cardPlaceholder: '#1f1f1f',
  rankStroke: '#b0c6ff',
  rankFill: '#2a2d3a',
};

export const luminousColors: NetwatchThemeColors = {
  surface: '#f8f9ff',
  surfaceLowest: '#ffffff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#cbdcf7',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#434655',
  outlineVariant: '#c3c6d7',
  primary: '#004ac6',
  onPrimary: '#ffffff',
  emerald: '#059669',
  amber: '#d97706',
  danger: '#dc2626',
  heroScrim: 'rgba(11,28,48,0.68)',
  cardPlaceholder: '#dce9ff',
  rankStroke: '#004ac6',
  rankFill: '#dce9ff',
};

export function colorsForTheme(theme: NetwatchThemeName): NetwatchThemeColors {
  return theme === 'obsidian' ? obsidianColors : luminousColors;
}
