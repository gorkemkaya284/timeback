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
