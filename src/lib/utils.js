import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with proper conflict resolution
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a relative time string (e.g., "2 phút trước")
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return new Date(date).toLocaleDateString('vi-VN');
}

/**
 * Format datetime for display
 */
export function formatDateTime(date) {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format time only
 */
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Platform display info
 */
export const PLATFORMS = {
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    bgClass: 'platform-facebook',
    icon: 'facebook',
  },
  zalo: {
    name: 'Zalo OA',
    color: '#0068ff',
    bgClass: 'platform-zalo',
    icon: 'zalo',
  },
  tiktok: {
    name: 'TikTok',
    color: '#ff0050',
    bgClass: 'platform-tiktok',
    icon: 'tiktok',
  },
  youtube: {
    name: 'YouTube',
    color: '#ff0000',
    bgClass: 'platform-youtube',
    icon: 'youtube',
  },
};

/**
 * Generate initials from a name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
