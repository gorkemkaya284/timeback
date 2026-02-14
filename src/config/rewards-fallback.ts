/**
 * Hardcoded ödül listesi — DB tabloları yokken veya fetch hata verdiğinde kullanılır.
 * 1P = 0.01 TL => 50TL=5000P, 100TL=10000P, 300TL=30000P
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
  {
    id: 'fallback-gift',
    title: 'Timeback Dijital Ödül',
    provider: 'manual',
    kind: 'gift',
    image_url: null,
    is_active: true,
    sort_order: 10,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-bank',
    title: 'Banka Havalesi',
    provider: 'manual',
    kind: 'bank_transfer',
    image_url: null,
    is_active: true,
    sort_order: 20,
    created_at: new Date().toISOString(),
  },
];

export const FALLBACK_VARIANTS = [
  { id: 'fallback-gift-50', reward_id: 'fallback-gift', denomination_tl: 50, cost_points: 5000, stock: null, daily_limit_per_user: null, min_account_age_days: null, is_active: true, created_at: new Date().toISOString() },
  { id: 'fallback-gift-100', reward_id: 'fallback-gift', denomination_tl: 100, cost_points: 10000, stock: null, daily_limit_per_user: null, min_account_age_days: null, is_active: true, created_at: new Date().toISOString() },
  { id: 'fallback-bank-300', reward_id: 'fallback-bank', denomination_tl: 300, cost_points: 30000, stock: null, daily_limit_per_user: 1, min_account_age_days: 3, is_active: true, created_at: new Date().toISOString() },
];
