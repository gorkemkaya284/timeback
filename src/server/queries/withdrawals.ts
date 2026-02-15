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
 * Fetches user withdrawals from reward_redemptions.
 * Joins reward_variants for payout_tl, rewards for title.
 */
export async function getUserWithdrawals(
  userId: string,
  { limit = 50 }: { limit?: number } = {}
): Promise<WithdrawalRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('id, created_at, cost_points, payout_tl, status, reward_variants(rewards(title))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []).map((r) => {
    const variant = (r as { reward_variants?: { rewards?: { title?: string } | null } | null }).reward_variants;
    const rewards = variant && typeof variant === 'object' ? variant.rewards : null;
    return {
      id: String(r.id),
      created_at: r.created_at,
      amount_tl: (r as { payout_tl?: number }).payout_tl ?? null,
      points: (r as { cost_points?: number }).cost_points ?? 0,
      status: String(r.status ?? 'pending'),
      method: 'reward',
      reference: (r as { variant_id?: string }).variant_id ?? null,
      processed_at: (r as { reviewed_at?: string }).reviewed_at ?? null,
      reward_title: rewards?.title ?? undefined,
    };
  });
}
