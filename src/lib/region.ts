export const REGION_COOKIE = 'netwatch_region';
export const DEFAULT_REGION = 'US';
const REGION_CODE = /^[A-Z]{2}$/;
const INVALID_GEO = new Set(['XX', 'T1']);

export const CURATED_REGIONS = [
  { code: 'US', label: 'United States' },
  { code: 'IN', label: 'India' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'KR', label: 'South Korea' },
  { code: 'JP', label: 'Japan' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Spain' },
  { code: 'MX', label: 'Mexico' },
  { code: 'BR', label: 'Brazil' },
] as const;

export type CuratedRegionCode = (typeof CURATED_REGIONS)[number]['code'];

export function normalizeRegionCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (INVALID_GEO.has(upper)) return null;
  return REGION_CODE.test(upper) ? upper : null;
}

export function getRegionLabel(code: string): string {
  const match = CURATED_REGIONS.find((r) => r.code === code);
  return match?.label ?? code;
}

export function isCuratedRegionCode(code: string): code is CuratedRegionCode {
  return CURATED_REGIONS.some((r) => r.code === code);
}