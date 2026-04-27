import React from 'react';
import { cn } from '@/lib/utils';
import { PLATFORMS } from '@/lib/utils';

/**
 * Platform badge — shows colored icon for Facebook, Zalo, or TikTok
 */
export default function PlatformBadge({ platform, size = 'sm', showLabel = false, className }) {
  const info = PLATFORMS[platform];
  if (!info) return null;

  const sizeClasses = {
    xs: 'w-4 h-4 text-[8px]',
    sm: 'w-5 h-5 text-[9px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
  };

  const icons = {
    facebook: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[60%] h-[60%]">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    zalo: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[60%] h-[60%]">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.533c-.06.24-.24.42-.48.48-.6.12-2.88.48-5.4.48s-4.8-.36-5.4-.48a.6.6 0 01-.48-.48c-.12-.6-.12-2.52-.12-2.52s0-1.92.12-2.52c.06-.24.24-.42.48-.48.6-.12 2.88-.48 5.4-.48s4.8.36 5.4.48c.24.06.42.24.48.48.12.6.12 2.52.12 2.52s0 1.92-.12 2.52zM10.2 14.4V9.6l4.8 2.4-4.8 2.4z" />
      </svg>
    ),
    tiktok: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[60%] h-[60%]">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88A2.89 2.89 0 019.5 12.4a2.73 2.73 0 01.4.03V9.01a6.24 6.24 0 00-.4-.02 6.28 6.28 0 00-6.28 6.28 6.28 6.28 0 006.28 6.28 6.28 6.28 0 006.28-6.28V9.4a8.16 8.16 0 004.81 1.56V7.51a4.84 4.84 0 01-1-.82z" />
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[60%] h-[60%]">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center shrink-0',
          sizeClasses[size],
          info.bgClass,
          'border'
        )}
        style={{ color: info.color }}
        title={info.name}
      >
        {icons[platform]}
      </div>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: info.color }}>
          {info.name}
        </span>
      )}
    </div>
  );
}
