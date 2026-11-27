import { cookies, headers } from 'next/headers';
import { DEFAULT_REGION, normalizeRegionCode, REGION_COOKIE } from '@netwatch/core/region';

/**
 * Resolves the active chart region: cookie override, then geo headers, then US.
 */
export async function resolveHomeRegion(): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = normalizeRegionCode(cookieStore.get(REGION_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  const hdrs = await headers();
  const geoHeaderNames = [
    'cf-ipcountry',
    'x-vercel-ip-country',
    'cloudfront-viewer-country',
  ] as const;

  for (const name of geoHeaderNames) {
    const fromHeader = normalizeRegionCode(hdrs.get(name));
    if (fromHeader) return fromHeader;
  }

  return DEFAULT_REGION;
}