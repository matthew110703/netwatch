import { notFound } from 'next/navigation';
import { AnimeWatchClient } from '@/components/AnimeWatchClient';
import { getAnimeDetailData } from '@/services/anime-catalog.service';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ anilistId: string; episode: string }>;
};

export default async function AnimeWatchPage({ params }: PageProps) {
  const { anilistId, episode: episodeRaw } = await params;
  const id = Number(anilistId);
  const episode = Math.max(1, Number(episodeRaw) || 1);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const detail = await getAnimeDetailData(id);
  if (!detail) notFound();

  const clampedEpisode = Math.min(episode, detail.episodes);

  return <AnimeWatchClient detail={detail} episode={clampedEpisode} />;
}