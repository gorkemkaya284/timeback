/**
 * Ödül/çekim ile ilgili sabitler.
 * Minimum çekim tutarı tek yerde tanımlanır.
 */
export const MIN_REDEMPTION_POINTS = Math.max(
  1,
  parseInt(process.env.MIN_REDEMPTION_THRESHOLD || '100', 10)
);

/** false = ödüller listelenir ama redeem butonları devre dışı, banner gösterilir */
export const REDEEM_ENABLED =
  process.env.REDEEM_ENABLED !== 'false' && process.env.NEXT_PUBLIC_REDEEM_ENABLED !== 'false';
