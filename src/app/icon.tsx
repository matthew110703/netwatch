import { createNetwatchIconImage } from '@/lib/og-card';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return createNetwatchIconImage(32);
}
