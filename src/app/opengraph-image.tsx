import { createNetwatchOgImage } from '@/lib/og-card';

export const alt = 'Netwatch | Elite Cinematic Streaming';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return createNetwatchOgImage();
}
