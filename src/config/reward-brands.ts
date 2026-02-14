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
};

const brands: Record<BrandKey, BrandConfig> = {
  google_play: {
    key: 'google_play',
    displayName: 'Google Play',
    subtitle: 'Hediye Kartı',
    icon: Play,
    gradient: 'from-emerald-500/20 via-green-500/10 to-teal-500/15',
    badge: 'POPÜLER',
  },
  app_store: {
    key: 'app_store',
    displayName: 'App Store',
    subtitle: '& iTunes',
    icon: Apple,
    gradient: 'from-gray-400/20 via-gray-300/10 to-gray-500/15',
    badge: 'EN ÇOK SEÇİLEN',
  },
  steam: {
    key: 'steam',
    displayName: 'Steam',
    subtitle: 'Wallet',
    icon: Gamepad2,
    gradient: 'from-slate-600/25 via-slate-500/15 to-slate-700/20',
    badge: null,
  },
  netflix: {
    key: 'netflix',
    displayName: 'Netflix',
    subtitle: 'Abonelik',
    icon: Tv,
    gradient: 'from-red-600/25 via-red-500/15 to-red-700/20',
    badge: 'POPÜLER',
  },
  spotify: {
    key: 'spotify',
    displayName: 'Spotify',
    subtitle: 'Premium',
    icon: Music,
    gradient: 'from-green-500/25 via-emerald-600/15 to-green-700/20',
    badge: null,
  },
  bank_transfer: {
    key: 'bank_transfer',
    displayName: 'Banka Havalesi',
    subtitle: 'Anında transfer',
    icon: Banknote,
    gradient: 'from-blue-600/20 via-indigo-500/10 to-blue-700/15',
    badge: 'MIN 300 TL',
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
