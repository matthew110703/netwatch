import { NextRequest, NextResponse } from 'next/server';
import { moviesApi, tvApi } from '@/lib/api';
import { getTmdbImageUrl } from '@/lib/tmdb-image';
import { TMDBVideo } from '@/lib/types';

function pickYoutubeTrailerKey(videos?: TMDBVideo[]): string | undefined {
  if (!videos || videos.length === 0) return undefined;
  const trailer =
    videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
    videos.find((v) => v.site === 'YouTube');
  return trailer?.key;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0 || (type !== 'movie' && type !== 'tv')) {
    return NextResponse.json({ success: false, error: 'Invalid preview request' }, { status: 400 });
  }

  try {
    if (type === 'tv') {
      const tvDetails = await tvApi.getTvDetails(numId, { append_to_response: 'videos' });
      const trailerKey = pickYoutubeTrailerKey(tvDetails.videos?.results);

      return NextResponse.json(
        {
          success: true,
          data: {
            id: tvDetails.id,
            type: 'tv',
            title: tvDetails.name,
            overview: tvDetails.overview,
            backdropUrl: getTmdbImageUrl(tvDetails.backdrop_path, 'w1280'),
            posterUrl: getTmdbImageUrl(tvDetails.poster_path, 'w500'),
            rating: tvDetails.vote_average,
            year: tvDetails.first_air_date ? tvDetails.first_air_date.split('-')[0] : '',
            genres: tvDetails.genres || [],
            numberOfSeasons: tvDetails.number_of_seasons || 1,
            numberOfEpisodes: tvDetails.number_of_episodes || 1,
            cast: (tvDetails.credits?.cast || []).slice(0, 6).map((c) => ({
              id: c.id,
              name: c.name,
              character: c.character,
              profileUrl: getTmdbImageUrl(c.profile_path, 'w300'),
            })),
            servers: tvDetails.servers || [],
            tagline: tvDetails.tagline,
            trailerKey,
          },
        },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
      );
    }

    const movieDetails = await moviesApi.getMovieDetails(numId, { append_to_response: 'videos' });
    const trailerKey = pickYoutubeTrailerKey(movieDetails.videos?.results);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: movieDetails.id,
          type: 'movie',
          title: movieDetails.title,
          overview: movieDetails.overview,
          backdropUrl: getTmdbImageUrl(movieDetails.backdrop_path, 'w1280'),
          posterUrl: getTmdbImageUrl(movieDetails.poster_path, 'w500'),
          rating: movieDetails.vote_average,
          year: movieDetails.release_date ? movieDetails.release_date.split('-')[0] : '',
          runtime: movieDetails.runtime,
          genres: movieDetails.genres || [],
          trailerKey,
          cast: (movieDetails.credits?.cast || []).slice(0, 6).map((c) => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profileUrl: getTmdbImageUrl(c.profile_path, 'w300'),
          })),
          servers: movieDetails.servers || [],
          tagline: movieDetails.tagline,
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    );
  } catch (error) {
    console.warn(`[Preview Route] Failed to load details for ${type}/${id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch details' },
      { status: 500 }
    );
  }
}
