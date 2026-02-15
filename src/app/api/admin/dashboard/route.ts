import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

/**
 * GET /api/admin/dashboard
 * KPIs: pending withdrawals, approved/rejected/blocks 24h, top risk users 24h
 * Latest activity (50): redeem_attempt/success/blocked from tb_security_events
 * High risk queue: users with risk_max_24h >= 70 + last redemptions
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 500 });
    }

    const since24h = new Date();
    since24h.setHours(since24h.getHours() - 24);
    const since24hIso = since24h.toISOString();

    const [pendingRes, approved24Res, rejected24Res, blocks24Res, activityRes, riskSummaryRes, redemptionsRes] = await Promise.all([
      admin.from('tb_reward_redemptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('tb_reward_redemptions').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', since24hIso),
      admin.from('tb_reward_redemptions').select('id', { count: 'exact', head: true }).eq('status', 'rejected').gte('created_at', since24hIso),
      admin.from('tb_risk_assessments').select('id', { count: 'exact', head: true }).eq('recommended_action', 'block').gte('created_at', since24hIso),
      admin.from('tb_security_events').select('id, user_id, event_type, ip, created_at, metadata').in('event_type', ['redeem_attempt', 'redeem_success', 'redeem_blocked']).order('created_at', { ascending: false }).limit(50),
      admin.from('v_admin_user_risk_summary').select('*').gte('risk_max_24h', 70).order('risk_max_24h', { ascending: false }).limit(20),
      admin.from('tb_reward_redemptions').select('id, user_id, status, payout_tl, cost_points, created_at').order('created_at', { ascending: false }).limit(100),
    ]);

    const pending = pendingRes.count ?? 0;
    const approved_24h = approved24Res.count ?? 0;
    const rejected_24h = rejected24Res.count ?? 0;
    const blocks_24h = blocks24Res.count ?? 0;

    const latestActivity = (activityRes.data ?? []).map((r: { id: string; user_id: string | null; event_type: string; ip: string; created_at: string; metadata: unknown }) => ({
      id: r.id,
      user_id: r.user_id,
      event_type: r.event_type,
      ip: r.ip,
      created_at: r.created_at,
      metadata: r.metadata,
    }));

    const topRiskUsers24h = (riskSummaryRes.data ?? []).map((r: { user_id: string; risk_max_24h: number | null; blocks_24h: number | null; last_ip: string | null }) => ({
      user_id: r.user_id,
      risk_max_24h: r.risk_max_24h ?? 0,
      blocks_24h: r.blocks_24h ?? 0,
      last_ip: r.last_ip,
    }));

    const highRiskUserIds = new Set((riskSummaryRes.data ?? []).map((r: { user_id: string }) => r.user_id));
    const highRiskQueue = (redemptionsRes.data ?? [])
      .filter((r: { user_id: string }) => highRiskUserIds.has(r.user_id))
      .slice(0, 30)
      .map((r: { id: string; user_id: string; status: string; payout_tl: number; cost_points: number; created_at: string }) => ({
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        payout_tl: r.payout_tl,
        cost_points: r.cost_points,
        created_at: r.created_at,
      }));

    return NextResponse.json({
      ok: true,
      kpis: { pending, approved_24h, rejected_24h, blocks_24h },
      latest_activity: latestActivity,
      top_risk_users_24h: topRiskUsers24h,
      high_risk_queue: highRiskQueue,
    });
  } catch (err) {
    console.error('[admin/dashboard]', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
