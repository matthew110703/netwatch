import { StreamingServerOption } from '@ripperdoc-chrome77/components';

export const MOCK_AVAILABLE_SERVERS: StreamingServerOption[] = [
  {
    id: 'native',
    name: 'Netwatch Direct HLS',
    quality: 'Adaptive HLS • Ad-Free',
    speed: '4ms',
    isRecommended: true,
  },
  {
    id: 'vidrift',
    name: 'VidRift Prime',
    quality: 'Adaptive HLS',
    speed: '12ms',
    isRecommended: false,
  },
  {
    id: 'vidlink',
    name: 'VidLink Pro',
    quality: 'Adaptive Multi',
    speed: '18ms',
    isRecommended: false,
  },
];