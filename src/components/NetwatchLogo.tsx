import React from 'react';

export interface NetwatchLogoProps {
  size?: 'sm' | 'md';
}

export const NetwatchLogo: React.FC<NetwatchLogoProps> = ({ size = 'md' }) => {
  const isSm = size === 'sm';

  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span
        className={`inline-flex items-center justify-center rounded-lg bg-[var(--rd-color-primary)] text-[var(--rd-color-on-primary)] shadow-sm shrink-0 ${
          isSm ? 'w-6 h-6' : 'w-8 h-8'
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'}
        >
          <path
            d="M8 6.5V17.5L17.5 12L8 6.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span
        className={`font-extrabold tracking-tight leading-none ${
          isSm ? 'text-base' : 'text-xl'
        }`}
      >
        <span className="text-[var(--rd-color-on-surface)]">Net</span>
        <span className="text-[var(--rd-color-primary)]">watch</span>
      </span>
    </span>
  );
};
