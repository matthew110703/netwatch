export function formatDuration(runtimeMinutes?: number): string {
  if (!runtimeMinutes || runtimeMinutes <= 0) return '';
  const hours = Math.floor(runtimeMinutes / 60);
  const minutes = runtimeMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatReleaseYear(dateString?: string): string {
  if (!dateString) return '';
  return dateString.split('-')[0] || '';
}

export function calculateMatchScore(voteAverage: number): number {
  if (!voteAverage || voteAverage <= 0) return 0;
  return Math.min(99, Math.max(50, Math.round(voteAverage * 10)));
}
