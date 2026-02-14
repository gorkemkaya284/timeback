import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type WithdrawalRow = {
  id: string;
  created_at: string;
  amount_tl: number | null;
  points: number;
  status: string;
  method: string | null;
  reference: string | null;
  processed_at: string | null;
  reward_title?: string;
};

/**
 * Fetches user withdrawals. Queries redemptions table (id, created_at, points, status, etc).
 * Status from withdrawals/redemptions only — no ledger-based logic.
 * When withdrawals view is deployed, switch to .from('withdrawals').
 */
export async function getUserWithdrawals(
  userId: string,
  { limit = 50 }: { limit?: number } = {}
): Promise<WithdrawalRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('redemptions')
    .select('id, created_at, points_spent, status, reward_id, rewards(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []).map((r) => {
    const rewards = (r as { rewards?: { title?: string } | null }).rewards;
    return {
      id: String(r.id),
      created_at: r.created_at,
      amount_tl: null,
      points: r.points_spent,
      status: String(r.status ?? 'pending'),
      method: 'reward',
      reference: r.reward_id != null ? String(r.reward_id) : null,
      processed_at: null,
      reward_title: rewards?.title ?? undefined,
    };
  });
}
