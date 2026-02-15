import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';

export type MyRedemptionItem = {
  id: string;
  status: string;
  payout_tl: number;
  cost_points: number;
  created_at: string;
  reward_title: string | null;
};

/**
 * GET /api/me/redemptions
 * Current user's redemptions from tb_reward_redemptions with reward title (join tb_reward_variants, tb_rewards).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: rows, error } = await supabase
      .from('tb_reward_redemptions')
      .select('id, variant_id, status, payout_tl, cost_points, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[me/redemptions]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (rows ?? []) as { id: string; variant_id: string; status: string; payout_tl: number; cost_points: number; created_at: string }[];
    if (list.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const variantIds = [...new Set(list.map((r) => r.variant_id))];
    const { data: variants } = await supabase
      .from('tb_reward_variants')
      .select('id, reward_id')
      .in('id', variantIds);

    const rewardIds = [...new Set((variants ?? []).map((v: { reward_id: string }) => v.reward_id))];
    const { data: rewards } = await supabase
      .from('tb_rewards')
      .select('id, title')
      .in('id', rewardIds);

    const rewardMap = new Map<string, string>();
    (rewards ?? []).forEach((r: { id: string; title: string }) => rewardMap.set(r.id, r.title));
    const variantToReward = new Map<string, string>();
    (variants ?? []).forEach((v: { id: string; reward_id: string }) => variantToReward.set(v.id, v.reward_id));

    const data: MyRedemptionItem[] = list.map((r) => ({
      id: r.id,
      status: r.status,
      payout_tl: r.payout_tl,
      cost_points: r.cost_points,
      created_at: r.created_at,
      reward_title: variantToReward.get(r.variant_id) ? rewardMap.get(variantToReward.get(r.variant_id)!) ?? null : null,
    }));

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('[me/redemptions] exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
