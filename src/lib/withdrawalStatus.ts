/**
 * Çekim (withdrawal) durumları — tek kaynak.
 */

export type WithdrawalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'paid';

export type BadgeVariant = 'default' | 'success' | 'destructive' | 'warning';

const VARIANT_TO_CANONICAL: Record<string, WithdrawalStatus> = {
  approved: 'approved',
  APPROVED: 'approved',
  Approved: 'approved',
  paid: 'paid',
  PAID: 'paid',
  Paid: 'paid',
  fulfilled: 'paid',
  FULFILLED: 'paid',
  Fulfilled: 'paid',
  complete: 'paid',
  completed: 'paid',
  success: 'paid',
  Success: 'paid',
  rejected: 'rejected',
  REJECTED: 'rejected',
  Rejected: 'rejected',
  processing: 'processing',
  PROCESSING: 'processing',
  Processing: 'processing',
  in_progress: 'processing',
  'in-progress': 'processing',
  pending: 'pending',
  PENDING: 'pending',
  Pending: 'pending',
  cancelled: 'rejected',
  failed: 'rejected',
};

/**
 * Maps common variants (e.g. 'APPROVED', 'Approved', 'complete', 'completed', 'success')
 * to the canonical WithdrawalStatus set.
 * Returns 'pending' ONLY for null/undefined.
 * For unknown non-empty status: console.error, return 'pending' (TODO: add proper handling).
 */
export function normalizeWithdrawalStatus(
  input: string | null | undefined
): WithdrawalStatus {
  if (input === null || input === undefined) {
    return 'pending';
  }
  const trimmed = String(input).trim();
  if (trimmed === '') {
    return 'pending';
  }
  const lower = trimmed.toLowerCase();
  const canonical = VARIANT_TO_CANONICAL[trimmed] ?? VARIANT_TO_CANONICAL[lower];
  if (canonical) {
    return canonical;
  }
  // TODO: Add proper handling for unknown statuses (e.g. schema validation, admin alert)
  console.error(
    `[withdrawalStatus] Unknown withdrawal status: "${input}". Falling back to pending.`
  );
  return 'pending';
}

const STATUS_UI: Record<
  WithdrawalStatus,
  { label: string; badgeVariant: BadgeVariant }
> = {
  pending: { label: 'Beklemede', badgeVariant: 'warning' },
  approved: { label: 'Tamamlandı', badgeVariant: 'success' },
  paid: { label: 'Tamamlandı', badgeVariant: 'success' },
  rejected: { label: 'Reddedildi', badgeVariant: 'destructive' },
  processing: { label: 'İşleniyor', badgeVariant: 'warning' },
};

const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  destructive: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
};

export function getWithdrawalStatusUI(status: WithdrawalStatus): {
  label: string;
  badgeVariant: BadgeVariant;
} {
  return STATUS_UI[status];
}

/** Badge variant -> Tailwind class string for inline use */
export function getWithdrawalBadgeClass(variant: BadgeVariant): string {
  return BADGE_VARIANT_CLASSES[variant] ?? BADGE_VARIANT_CLASSES.default;
}
