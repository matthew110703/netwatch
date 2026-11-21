'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CURATED_REGIONS, REGION_COOKIE } from '@/lib/region';
import { strings } from '@/app/strings';

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

interface RegionPickerProps {
  value: string;
}

export function RegionPicker({ value }: RegionPickerProps) {
  const router = useRouter();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value.toUpperCase();
    if (!next || next === value) return;
    document.cookie = `${REGION_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
    router.refresh();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <label
        htmlFor="netwatch-region-picker"
        className="text-sm font-medium text-[var(--rd-color-on-surface-variant)]"
      >
        {strings.regionPicker.label}
      </label>
      <select
        id="netwatch-region-picker"
        value={value}
        onChange={handleChange}
        className="rounded-md border border-[var(--rd-color-outline-variant)] bg-[var(--rd-color-surface-container)] px-3 py-2 text-sm text-[var(--rd-color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--rd-color-primary)]"
      >
        {CURATED_REGIONS.map((region) => (
          <option key={region.code} value={region.code}>
            {region.label}
          </option>
        ))}
        {!CURATED_REGIONS.some((r) => r.code === value) && (
          <option value={value}>{value}</option>
        )}
      </select>
    </div>
  );
}