import { StreamingServerOption } from '@ripperdoc-chrome77/components';

export const MOCK_AVAILABLE_SERVERS: StreamingServerOption[] = [
  {
    id: 'native',
    name: 'Netwatch Direct HLS',
    quality: '4K Direct • Ad-Free',
    speed: '4ms',
    isRecommended: true,
  },
  {
    id: 'vidrift',
    name: 'VidRift Prime',
    quality: '4K HLS (Shielded)',
    speed: '12ms',
    isRecommended: false,
  },
  {
    id: 'vidlink',
    name: 'VidLink Pro',
    quality: '1080p / 4K Multi (Shielded)',
    speed: '18ms',
    isRecommended: false,
  },
];
