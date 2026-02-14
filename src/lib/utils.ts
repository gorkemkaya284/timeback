import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True if string is a valid UUID (e.g. reward_variants.id from DB). Reject slugs like 'fb-gp-50'. */
export function isValidUuid(s: string | null | undefined): boolean {
  if (typeof s !== 'string' || !s) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(s.trim());
}

/**
 * Calculate total points from ledger entries.
 * 
 * IMPORTANT: Points are NEVER stored directly in user profiles.
 * This function computes points from the ledger, which is the single source of truth.
 * 
 * Why compute instead of store:
 * - Ensures accuracy (no sync issues)
 * - Full auditability (every transaction is recorded)
 * - Prevents fraud (can't manipulate a stored balance)
 * - Matches accounting best practices (ledger-based system)
 */
export function calculatePoints(ledgerEntries: { delta: number }[]): number {
  if (!ledgerEntries || ledgerEntries.length === 0) {
    return 0;
  }
  return ledgerEntries.reduce((total, entry) => total + entry.delta, 0);
}

// Format points for display (re-export from currency for consistency)
export { formatPoints } from '@/lib/currency';

// Check if user is admin by env allowlist (Option 2 fallback)
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
  return adminEmails.includes(email);
}

// Device/IP hashing utilities (simplified - use proper crypto in production)
export function hashDevice(deviceInfo: string): string {
  // Placeholder - implement proper hashing (e.g., SHA-256)
  return Buffer.from(deviceInfo).toString('base64');
}

export function hashIP(ip: string): string {
  // Placeholder - implement proper hashing
  return Buffer.from(ip).toString('base64');
}
