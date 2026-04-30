import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPlatform(platform: string) {
  const labels: Record<string, string> = {
    x: 'X',
    instagram: 'Instagram',
    facebook: 'Facebook',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    reddit: 'Reddit',
    snapchat: 'Snapchat',
    website: 'Website'
  };
  return labels[platform] ?? platform;
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function serializeDoc<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}
