import { MediaItem } from '@/lib/types';

export function calculateMatchPercentage(voteAverage: number): number {
  // Scales 0-10 rating to realistic 75%-99% match
  const percentage = Math.round(75 + (voteAverage / 10) * 24);
  return Math.min(99, Math.max(70, percentage));
}

export function extractReleaseYear(dateString?: string): string {
  if (!dateString) return '2024';
  return dateString.split('-')[0];
}

export function formatMediaCardProps(item: MediaItem) {
  return {
    id: item.id,
    title: item.title || item.name || 'Untitled Transmission',
    posterUrl: item.posterUrl,
    badge: item.badge,
    rating: item.vote_average,
    year: extractReleaseYear(item.release_date || item.first_air_date),
    matchPercentage: calculateMatchPercentage(item.vote_average),
  };
}
