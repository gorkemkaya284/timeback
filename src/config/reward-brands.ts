/**
 * Brand config for each reward type. Used for card styling.
 * Key is derived from reward title (normalized) or explicit mapping.
 */

import type { LucideIcon } from 'lucide-react';
import { Play, Apple, Gamepad2, Tv, Music, Banknote } from 'lucide-react';

export type BrandKey =
  | 'google_play'
  | 'app_store'
  | 'steam'
  | 'netflix'
  | 'spotify'
  | 'bank_transfer';

export type BrandConfig = {
  key: BrandKey;
  displayName: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  badge: string | null;
  imagePath: string;
};

const brands: Record<BrandKey, BrandConfig> = {
  google_play: {
    key: 'google_play',
    displayName: 'Google Play',
    subtitle: 'Hediye Kartı',
    icon: Play,
    gradient: 'from-emerald-600/90 via-green-600/80 to-teal-700/90',
    badge: 'POPÜLER',
    imagePath: '/rewards/google-play.svg',
  },
  app_store: {
    key: 'app_store',
    displayName: 'App Store',
    subtitle: '& iTunes',
    icon: Apple,
    gradient: 'from-gray-500/90 via-gray-400/80 to-gray-600/90',
    badge: 'EN ÇOK SEÇİLEN',
    imagePath: '/rewards/app-store.svg',
  },
  steam: {
    key: 'steam',
    displayName: 'Steam',
    subtitle: 'Wallet',
    icon: Gamepad2,
    gradient: 'from-slate-700/90 via-slate-600/80 to-slate-800/90',
    badge: null,
    imagePath: '/rewards/steam.svg',
  },
  netflix: {
    key: 'netflix',
    displayName: 'Netflix',
    subtitle: 'Abonelik',
    icon: Tv,
    gradient: 'from-red-700/90 via-red-600/80 to-red-800/90',
    badge: 'POPÜLER',
    imagePath: '/rewards/netflix.svg',
  },
  spotify: {
    key: 'spotify',
    displayName: 'Spotify',
    subtitle: 'Premium',
    icon: Music,
    gradient: 'from-green-600/90 via-emerald-700/80 to-green-800/90',
    badge: null,
    imagePath: '/rewards/spotify.svg',
  },
  bank_transfer: {
    key: 'bank_transfer',
    displayName: 'Banka Havalesi',
    subtitle: 'Anında transfer',
    icon: Banknote,
    gradient: 'from-blue-700/90 via-indigo-600/80 to-blue-800/90',
    badge: 'MIN 300 TL',
    imagePath: '/rewards/bank-transfer.svg',
  },
};

const TITLE_TO_KEY: Record<string, BrandKey> = {
  'google play hediye kartı': 'google_play',
  'google play': 'google_play',
  'app store & itunes': 'app_store',
  'app store': 'app_store',
  'steam wallet': 'steam',
  'steam': 'steam',
  'netflix': 'netflix',
  'spotify': 'spotify',
  'banka havalesi': 'bank_transfer',
  'timeback dijital ödül': 'google_play', // legacy fallback
};

export function getBrandConfig(rewardTitle: string): BrandConfig {
  const normalized = rewardTitle.toLowerCase().trim();
  const key = TITLE_TO_KEY[normalized] ?? 'google_play';
  return brands[key];
}

export { brands };
