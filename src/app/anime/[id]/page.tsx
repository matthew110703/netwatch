import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AnimeDetailClient } from '@/components/AnimeDetailClient';
import { getAnimeDetailData } from '@/services/anime-catalog.service';
import { SITE_NAME } from '@/lib/seo';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  const detail = Number.isFinite(numId) ? await getAnimeDetailData(numId) : null;
  if (!detail) {
    return { title: 'Anime not found' };
  }
  return {
    title: detail.card.title,
    description: detail.synopsis.slice(0, 160) || `${detail.card.title} on ${SITE_NAME}`,
    alternates: { canonical: `/anime/${id}` },
  };
}

export default async function AnimeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) notFound();

  const detail = await getAnimeDetailData(numId);
  if (!detail) notFound();

  return <AnimeDetailClient detail={detail} />;
}