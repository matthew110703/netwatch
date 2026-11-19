import { CastMember, Episode, MediaItem } from '@/lib/types';

export const MOCK_CAST: CastMember[] = [
  {
    id: 1,
    name: 'Elias Thorne',
    character: 'Dr. Aris Vance',
    profileUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 2,
    name: 'Sarah Lin',
    character: 'Commander Kora',
    profileUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 3,
    name: 'Marcus Sterling',
    character: 'The Architect',
    profileUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 4,
    name: 'Maya Reed',
    character: 'Lead Cryptographer',
    profileUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 5,
    name: 'David Chen',
    character: 'Tactical Pilot',
    profileUrl:
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80',
  },
];

export const MOCK_EPISODES: Episode[] = [
  {
    id: 101,
    episode_number: 1,
    season_number: 1,
    name: 'Winter Is Coming',
    overview:
      'Jon Arryn, the Hand of the King, is dead. King Robert Baratheon plans to ask his oldest friend, Eddard Stark, to take his place.',
    runtime: 62,
    stillUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 102,
    episode_number: 2,
    season_number: 1,
    name: 'The Kingsroad',
    overview:
      'While Bran recovers from his fall, Ned takes only his daughters to King’s Landing. Jon Snow travels north to the Wall.',
    runtime: 56,
    stillUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 103,
    episode_number: 3,
    season_number: 1,
    name: 'Lord Snow',
    overview:
      'Jon begins his training with the Night’s Watch; Ned confronts his past and present at King’s Landing.',
    runtime: 58,
    stillUrl:
      'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 104,
    episode_number: 4,
    season_number: 1,
    name: 'Cripples, Bastards, and Broken Things',
    overview:
      'Eddard investigates Jon Arryn’s secret murder. Jon takes measures to protect Samwell Tarly from abuse.',
    runtime: 56,
    stillUrl:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
  },
];

export const MOCK_MOVIE_DETAIL: MediaItem = {
  id: 1440098,
  title: 'Drawn Together: The Movie',
  overview:
    'When the network cancels their reality show, eight cartoon roommates embark on an outrageous journey to save their animated existence. A provocative, satirical comedy in ultra-high definition.',
  posterUrl:
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
  backdropUrl:
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=80',
  vote_average: 8.4,
  release_date: '2024-05-10',
  runtime: 112,
  media_type: 'movie',
  genres: [
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 878, name: 'Sci-Fi' },
  ],
};
