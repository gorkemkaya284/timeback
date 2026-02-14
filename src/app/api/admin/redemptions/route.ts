import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

export type AdminRedemptionRow = {
  id: string;
  user_id: string;
  status: string;
  payout_tl: number;
  cost_points: number;
  note: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  denomination_tl?: number;
  reward_title?: string;
  reward_kind?: string;
};

/**
 * GET /api/admin/redemptions?status=pending
 * Returns tb_reward_redemptions with variant + reward info. Service role.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ redemptions: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending';

    const { data: rows, error } = await admin
      .from('tb_reward_redemptions')
      .select('id, user_id, reward_variant_id, status, payout_tl, cost_points, note, created_at, reviewed_by, reviewed_at')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[admin/redemptions] GET error:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json(
        { error: 'Failed to fetch redemptions', message: error.message, code: error.code },
        { status: 500 }
      );
    }

    const list = (rows ?? []) as { id: string; user_id: string; reward_variant_id: string; status: string; payout_tl: number; cost_points: number; note: string | null; created_at: string; reviewed_by: string | null; reviewed_at: string | null }[];
    if (list.length === 0) {
      return NextResponse.json({ redemptions: [] });
    }

    const variantIds = [...new Set(list.map((r) => r.reward_variant_id))];
    const { data: variants, error: vErr } = await admin
      .from('tb_reward_variants')
      .select('id, denomination_tl, reward_id')
      .in('id', variantIds);

    if (vErr || !variants?.length) {
      const redemptions: AdminRedemptionRow[] = list.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        payout_tl: r.payout_tl,
        cost_points: r.cost_points,
        note: r.note,
        created_at: r.created_at,
        reviewed_by: r.reviewed_by,
        reviewed_at: r.reviewed_at,
      }));
      return NextResponse.json({ redemptions });
    }

    const rewardIds = [...new Set((variants as { reward_id: string }[]).map((v) => v.reward_id))];
    const { data: rewards, error: rErr } = await admin
      .from('tb_rewards')
      .select('id, title, kind')
      .in('id', rewardIds);

    const rewardMap = new Map<string | number, { title: string; kind: string }>();
    if (!rErr && rewards) {
      (rewards as { id: string; title: string; kind: string }[]).forEach((rw) => rewardMap.set(rw.id, { title: rw.title, kind: rw.kind }));
    }
    const variantMap = new Map<string, { denomination_tl: number; reward_id: string }>();
    (variants as { id: string; denomination_tl: number; reward_id: string }[]).forEach((v) => variantMap.set(v.id, { denomination_tl: v.denomination_tl, reward_id: v.reward_id }));

    const redemptions: AdminRedemptionRow[] = list.map((r) => {
      const v = variantMap.get(r.reward_variant_id);
      const rw = v ? rewardMap.get(v.reward_id) : null;
      return {
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        payout_tl: r.payout_tl,
        cost_points: r.cost_points,
        note: r.note,
        created_at: r.created_at,
        reviewed_by: r.reviewed_by,
        reviewed_at: r.reviewed_at,
        denomination_tl: v?.denomination_tl,
        reward_title: rw?.title,
        reward_kind: rw?.kind,
      };
    });

    return NextResponse.json({ redemptions });
  } catch (err) {
    console.error('[admin/redemptions] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
