/**
 * Tek kaynak: puan → TRY dönüşümü ve formatlama.
 * Default para birimi: TRY (₺)
 * Oran: 100 puan = 1 ₺
 */
export const POINTS_TO_TRY = 100;

/** Puan → TRY değer */
export function pointsToTry(points: number): number {
  return points / POINTS_TO_TRY;
}

/** TRY değerini ₺ ile formatla */
export function formatTry(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
}

/** Puanları formatla (tr-TR) */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat('tr-TR').format(points);
}
