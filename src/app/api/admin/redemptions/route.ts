import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { Database } from '@/types/database.types';

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
 * SERVICE ROLE only. tb_reward_redemptions JOIN tb_reward_variants JOIN tb_rewards.
 * Response: { ok: true, count, data } or { ok: false, error: { code, message, details, hint } }.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, error: { code: null, message: 'Unauthorized', details: null, hint: null } }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: { code: null, message: 'MISSING_SERVICE_ROLE', details: null, hint: null } },
        { status: 500 }
      );
    }

    const admin = createClient<Database>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending';

    const { data: rows, error } = await admin
      .from('tb_reward_redemptions')
      .select('id, user_id, reward_variant_id, status, payout_tl, cost_points, note, created_at, reviewed_by, reviewed_at')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      const err = error as { code?: string; message?: string; details?: string; hint?: string };
      console.error('[admin/redemptions] GET error:', err);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: err.code ?? null,
            message: err.message ?? 'Failed to fetch',
            details: err.details ?? null,
            hint: err.hint ?? null,
          },
        },
        { status: 500 }
      );
    }

    const list = (rows ?? []) as { id: string; user_id: string; reward_variant_id: string; status: string; payout_tl: number; cost_points: number; note: string | null; created_at: string; reviewed_by: string | null; reviewed_at: string | null }[];

    if (list.length === 0) {
      return NextResponse.json({ ok: true, count: 0, data: [], redemptions: [] });
    }

    const variantIds = [...new Set(list.map((r) => r.reward_variant_id))];
    const { data: variants, error: vErr } = await admin
      .from('tb_reward_variants')
      .select('id, denomination_tl, reward_id')
      .in('id', variantIds);

    if (vErr) {
      console.error('[admin/redemptions] variants error:', vErr);
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
      return NextResponse.json({ ok: true, count: redemptions.length, data: redemptions, redemptions });
    }

    const rewardIds = [...new Set((variants as { reward_id: string }[]).map((v) => v.reward_id))];
    const { data: rewards, error: rErr } = await admin
      .from('tb_rewards')
      .select('id, title, kind')
      .in('id', rewardIds);

    const rewardMap = new Map<string, { title: string; kind: string }>();
    if (!rErr && rewards) {
      (rewards as { id: string; title: string; kind: string }[]).forEach((rw) => rewardMap.set(rw.id, { title: rw.title, kind: rw.kind }));
    }
    const variantMap = new Map<string, { denomination_tl: number; reward_id: string }>();
    (variants ?? []).forEach((v: { id: string; denomination_tl: number; reward_id: string }) => variantMap.set(v.id, { denomination_tl: v.denomination_tl, reward_id: v.reward_id }));

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

    return NextResponse.json({ ok: true, count: redemptions.length, data: redemptions, redemptions });
  } catch (err) {
    console.error('[admin/redemptions] GET exception:', err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: null,
          message: err instanceof Error ? err.message : 'Internal server error',
          details: null,
          hint: null,
        },
      },
      { status: 500 }
    );
  }
}
