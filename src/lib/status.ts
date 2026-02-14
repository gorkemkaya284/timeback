/**
 * Çekim (redemption) durumları — tek kaynak.
 * pending | fulfilled | rejected — DB status değerleri.
 */
export type RedemptionStatusDb = 'pending' | 'fulfilled' | 'rejected';

export type RedemptionStatusLabel = 'Beklemede' | 'Tamamlandı' | 'Reddedildi';

export const REDEMPTION_STATUS: Record<
  RedemptionStatusDb,
  { label: RedemptionStatusLabel; variant: 'warn' | 'success' | 'danger' }
> = {
  pending: { label: 'Beklemede', variant: 'warn' },
  fulfilled: { label: 'Tamamlandı', variant: 'success' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
};

const STATUS_STYLES: Record<RedemptionStatusLabel, string> = {
  Beklemede: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
  Tamamlandı: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  Reddedildi: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
};

/** DB status -> UI label */
export function getRedemptionStatusLabel(status: string): RedemptionStatusLabel {
  const s = (status || '').toLowerCase();
  if (s === 'fulfilled') return 'Tamamlandı';
  if (s === 'rejected') return 'Reddedildi';
  return 'Beklemede';
}

/** UI label için badge class */
export function getRedemptionStatusStyle(label: RedemptionStatusLabel): string {
  return STATUS_STYLES[label] ?? STATUS_STYLES.Beklemede;
}

/** Ödül (reward) kullanılabilirlik durumları */
export type RewardAvailability = 'active' | 'out_of_stock' | 'coming_soon';

export const REWARD_AVAILABILITY: Record<
  RewardAvailability,
  { label: string; badgeStyle: string }
> = {
  active: { label: 'Mevcut', badgeStyle: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
  out_of_stock: { label: 'Stok bitti', badgeStyle: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' },
  coming_soon: { label: 'Yakında', badgeStyle: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' },
};

const UNLIMITED_STOCK = 999999;

/**
 * status: active | inactive | out_of_stock (yoksa default active)
 * stock: number | null | undefined (null/undefined veya >= UNLIMITED_STOCK = unlimited)
 */
export function getRewardAvailability(
  status: string | null | undefined,
  stock: number | null | undefined
): RewardAvailability {
  const isActive = (status ?? 'active').toLowerCase() === 'active';
  const stockNum = stock != null ? Number(stock) : null;
  const hasStock =
    stockNum === null ||
    stockNum >= UNLIMITED_STOCK ||
    stockNum > 0;

  if (!isActive) return 'coming_soon';
  if (isActive && !hasStock && stockNum !== null && stockNum < UNLIMITED_STOCK) return 'out_of_stock';
  return 'active';
}
