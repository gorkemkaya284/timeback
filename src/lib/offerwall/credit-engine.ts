import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';

const DEFAULT_USER_SHARE = 0.7;
const MIN_PLATFORM_PROFIT_TL = 2;
const POINT_VALUE_TL = 0.01;

/**
 * Calculate user points from payout_tl with profit protection.
 * Rule: user_tl = max(payout_tl * 0.7, payout_tl - 2)
 * user_points = floor(user_tl / 0.01)
 */
export function calculateOfferwallUserPoints(payoutTl: number): number {
  if (payoutTl <= 0) return 0;
  const userTl = Math.max(
    payoutTl * DEFAULT_USER_SHARE,
    payoutTl - MIN_PLATFORM_PROFIT_TL
  );
  return Math.floor(userTl / POINT_VALUE_TL);
}

/**
 * Credit an offerwall event to points_ledger via RPC.
 * - Uses points_ledger: user_id, delta (points), reason, ref_type (source/provider), ref_id (source_event_id).
 * - Idempotent: credited_at guard + unique (ref_type, ref_id); unique violation = already credited.
 * - Only credits if status is approved/completed/success.
 * - Feature flag: OFFERWALL_CREDIT_ENABLED (default false).
 * - Test allowlist: OFFERWALL_TEST_ALLOWLIST when disabled.
 * - All operations in single PostgreSQL transaction (RPC).
 */
export async function creditOfferwallEvent(eventId: string): Promise<{
  success: boolean;
  credited?: boolean;
  skipped?: string;
  error?: string;
  points?: number;
}> {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return { success: false, error: 'Admin client not available' };
  }

  const creditEnabled =
    process.env.OFFERWALL_CREDIT_ENABLED?.toLowerCase() === 'true';
  const allowlistRaw = process.env.OFFERWALL_TEST_ALLOWLIST ?? '';
  const testAllowlist = allowlistRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const { data, error } = await adminClient.rpc('credit_offerwall_event', {
    p_event_id: eventId,
    p_credit_enabled: creditEnabled,
    p_test_allowlist: testAllowlist,
  });

  if (error) {
    console.error('[creditOfferwallEvent] RPC error:', error.message);
    return { success: false, error: error.message };
  }

  const result = data as {
    success?: boolean;
    credited?: boolean;
    skipped?: string;
    error?: string;
    points?: number;
    user_id?: string;
    provider?: string;
  } | null;

  if (!result) {
    return { success: false, error: 'No response from RPC' };
  }

  if (result.credited) {
    console.log(
      `[creditOfferwallEvent] Credited event ${eventId} -> user ${result.user_id} +${result.points} pts (${result.provider})`
    );
  } else if (result.skipped) {
    console.log(`[creditOfferwallEvent] Skipped event ${eventId}: ${result.skipped}`);
  }

  return {
    success: result.success ?? false,
    credited: result.credited,
    skipped: result.skipped,
    error: result.error,
    points: result.points,
  };
}
