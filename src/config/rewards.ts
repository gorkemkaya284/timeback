/**
 * Ödül/çekim ile ilgili sabitler.
 * Minimum çekim tutarı tek yerde tanımlanır.
 */
export const MIN_REDEMPTION_POINTS = Math.max(
  1,
  parseInt(process.env.MIN_REDEMPTION_THRESHOLD || '100', 10)
);
