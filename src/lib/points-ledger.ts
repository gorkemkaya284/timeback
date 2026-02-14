import 'server-only';
/**
 * Points Ledger — single source of truth for user points.
 *
 * Total points are NEVER stored (e.g. not in profiles). They are always
 * computed from points_ledger via SUM(delta). This keeps one source of truth,
 * full auditability, and no balance sync issues.
 *
 * Use getCurrentUser() before calling getPointsSummary; in DEV_MODE it
 * returns DEV_USER_ID so the app works without auth.
 */
import { createClient } from '@/lib/supabase/server';

export type LedgerEntry = {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
};

export type PointsSummary = {
  totalPoints: number;
  recentEntries: LedgerEntry[];
};

/**
 * Server-only: get total points (from DB SUM) and last 10 ledger entries.
 * Pass user_id from getCurrentUser().id (DEV_USER_ID when DEV_MODE).
 */
export async function getPointsSummary(userId: string): Promise<PointsSummary> {
  const supabase = await createClient();

  // Total from DB: COALESCE(SUM(delta), 0) — single source of truth
  const { data: totalData, error: totalError } = await supabase.rpc(
    'get_user_points',
    { p_user_id: userId }
  );

  if (totalError) {
    // If RPC not deployed yet, fall back to client-side sum from last N rows
    // (not ideal for large ledgers; deploy get_user_points for production)
    const { data: rows } = await supabase
      .from('points_ledger')
      .select('delta')
      .eq('user_id', userId);
    const totalPoints = rows
      ? rows.reduce((sum, r) => sum + r.delta, 0)
      : 0;

    const { data: recent } = await supabase
      .from('points_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      totalPoints,
      recentEntries: (recent || []) as LedgerEntry[],
    };
  }

  const totalPoints = typeof totalData === 'number' ? totalData : 0;

  const { data: recent, error: recentError } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentError) {
    return { totalPoints, recentEntries: [] };
  }

  return {
    totalPoints,
    recentEntries: (recent || []) as LedgerEntry[],
  };
}
