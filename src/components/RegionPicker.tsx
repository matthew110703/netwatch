'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@ripperdoc-chrome77/components';
import { CURATED_REGIONS, REGION_COOKIE } from '@/lib/region';
import { strings } from '@/app/strings';

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

interface RegionPickerProps {
  value: string;
}

export function RegionPicker({ value }: RegionPickerProps) {
  const router = useRouter();

  const options = useMemo(() => {
    const base = CURATED_REGIONS.map((region) => ({
      value: region.code,
      label: region.label,
    }));
    if (!CURATED_REGIONS.some((r) => r.code === value)) {
      return [...base, { value, label: value }];
    }
    return base;
  }, [value]);

  const handleChange = (next: string) => {
    const code = next.toUpperCase();
    if (!code || code === value) return;
    document.cookie = `${REGION_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
    router.refresh();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <span
        id="netwatch-region-picker-label"
        className="text-sm font-medium text-[var(--rd-color-on-surface-variant)]"
      >
        {strings.regionPicker.label}
      </span>
      <Select
        id="netwatch-region-picker"
        value={value}
        options={options}
        onChange={handleChange}
        ariaLabelledBy="netwatch-region-picker-label"
        size="md"
        className="min-w-[12rem]"
      />
    </div>
  );
}