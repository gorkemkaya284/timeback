/**
 * Hardcoded ödül listesi — DB tabloları yokken veya fetch hata verdiğinde kullanılır.
 * 1P = 0.01 TL => cost_points = denomination_tl * 100
 */

export const FALLBACK_REWARDS: Array<{
  id: string;
  title: string;
  provider: string;
  kind: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}> = [
  { id: 'fb-gp', title: 'Google Play Hediye Kartı', provider: 'manual', kind: 'gift', image_url: null, is_active: true, sort_order: 10, created_at: new Date().toISOString() },
  { id: 'fb-as', title: 'App Store & iTunes', provider: 'manual', kind: 'gift', image_url: null, is_active: true, sort_order: 20, created_at: new Date().toISOString() },
  { id: 'fb-st', title: 'Steam Wallet', provider: 'manual', kind: 'gift', image_url: null, is_active: true, sort_order: 30, created_at: new Date().toISOString() },
  { id: 'fb-nf', title: 'Netflix', provider: 'manual', kind: 'gift', image_url: null, is_active: true, sort_order: 40, created_at: new Date().toISOString() },
  { id: 'fb-sp', title: 'Spotify', provider: 'manual', kind: 'gift', image_url: null, is_active: true, sort_order: 50, created_at: new Date().toISOString() },
  { id: 'fb-bk', title: 'Banka Havalesi', provider: 'manual', kind: 'bank_transfer', image_url: null, is_active: true, sort_order: 60, created_at: new Date().toISOString() },
];

const V = (reward_id: string, denomination_tl: number, daily_limit?: number, min_age?: number) => ({
  id: `fb-${reward_id}-${denomination_tl}`,
  reward_id,
  denomination_tl,
  cost_points: denomination_tl * 100,
  stock: null,
  daily_limit_per_user: daily_limit ?? null,
  min_account_age_days: min_age ?? null,
  is_active: true,
  created_at: new Date().toISOString(),
});

export const FALLBACK_VARIANTS = [
  ...['fb-gp'].flatMap((rid) => [V(rid, 50), V(rid, 100), V(rid, 250)]),
  ...['fb-as'].flatMap((rid) => [V(rid, 50), V(rid, 100), V(rid, 250)]),
  ...['fb-st'].flatMap((rid) => [V(rid, 50), V(rid, 100), V(rid, 200)]),
  ...['fb-nf'].flatMap((rid) => [V(rid, 100), V(rid, 200)]),
  ...['fb-sp'].flatMap((rid) => [V(rid, 100), V(rid, 200)]),
  V('fb-bk', 300, 1, 3),
];
