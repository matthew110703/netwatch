export function formatHeroYear(releaseDate?: string): string {
  if (!releaseDate) return '2024';
  return releaseDate.split('-')[0];
}

export function formatHeroRuntime(minutes?: number): string {
  if (!minutes) return '2h 14m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
