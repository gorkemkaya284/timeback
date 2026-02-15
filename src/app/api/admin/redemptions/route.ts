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
  risk_score?: number;
  risk_flags?: string[];
  risk_action?: 'allow' | 'review' | 'block';
  last_ip?: string | null;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * GET /api/admin/redemptions?status=...&q=...&limit=50
 * status: "all" = no filter; otherwise r.status = status
 * q: search by user_id (prefix) or redemption id (exact)
 * Join: r (tb_reward_redemptions), v (tb_reward_variants) on v.id = r.variant_id, rw (tb_rewards) on rw.id = v.reward_id
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, error: { code: null, message: 'Unauthorized', details: null, hint: null } }, { status: 403 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: { code: null, message: 'MISSING_SERVICE_ROLE', details: null, hint: null } },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') ?? 'pending';
    const q = searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const riskFilter = searchParams.get('risk')?.trim(); // 'low' | 'medium' | 'high' (0-29, 30-69, 70+)
    const since = searchParams.get('since')?.trim(); // iso 24h/7d filter

    let query = admin
      .from('tb_reward_redemptions')
      .select('id, user_id, variant_id, status, payout_tl, cost_points, note, created_at, reviewed_by, reviewed_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusParam !== 'all') {
      query = query.eq('status', statusParam);
    }

    if (q) {
      const uuidLike = /^[0-9a-f-]{36}$/i.test(q);
      if (uuidLike) {
        query = query.or(`id.eq.${q},user_id.eq.${q}`);
      } else {
        query = query.ilike('user_id', `${q}%`);
      }
    }

    if (since) {
      query = query.gte('created_at', since);
    }

    const { data: rows, error } = await query;

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

    const list = (rows ?? []) as { id: string; user_id: string; variant_id: string; status: string; payout_tl: number; cost_points: number; note: string | null; created_at: string; reviewed_by: string | null; reviewed_at: string | null }[];

    if (list.length === 0) {
      return NextResponse.json({ ok: true, count: 0, data: [], redemptions: [] });
    }

    const variantIds = [...new Set(list.map((r) => r.variant_id))];
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

    const redemptionIds = list.map((r) => r.id);
    const { data: riskRows } = await admin
      .from('tb_risk_assessments')
      .select('entity_id, risk_score, flags, recommended_action')
      .eq('entity_type', 'reward_redemption')
      .in('entity_id', redemptionIds);

    const riskMap = new Map<string, { risk_score: number; flags: string[]; recommended_action: string }>();
    (riskRows ?? []).forEach((row: { entity_id: string; risk_score: number; flags: string[]; recommended_action: string }) => {
      riskMap.set(row.entity_id, { risk_score: row.risk_score, flags: row.flags ?? [], recommended_action: row.recommended_action });
    });

    const userIds = [...new Set(list.map((r) => r.user_id))];
    const { data: riskSummaryRows } = await admin
      .from('v_admin_user_risk_summary')
      .select('user_id, last_ip')
      .in('user_id', userIds);
    const lastIpMap = new Map<string, string>();
    (riskSummaryRows ?? []).forEach((row: { user_id: string; last_ip: string | null }) => {
      if (row.last_ip) lastIpMap.set(row.user_id, row.last_ip);
    });

    let redemptions: AdminRedemptionRow[] = list.map((r) => {
      const v = variantMap.get(r.variant_id);
      const rw = v ? rewardMap.get(v.reward_id) : null;
      const risk = riskMap.get(r.id);
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
        risk_score: risk?.risk_score,
        risk_flags: risk?.flags,
        risk_action: risk?.recommended_action as 'allow' | 'review' | 'block' | undefined,
        last_ip: lastIpMap.get(r.user_id) ?? null,
      };
    });

    if (riskFilter === 'low') {
      redemptions = redemptions.filter((r) => (r.risk_score ?? 0) < 30);
    } else if (riskFilter === 'medium') {
      redemptions = redemptions.filter((r) => { const s = r.risk_score ?? 0; return s >= 30 && s < 70; });
    } else if (riskFilter === 'high') {
      redemptions = redemptions.filter((r) => (r.risk_score ?? 0) >= 70);
    }

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
