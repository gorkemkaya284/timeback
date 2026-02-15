import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

/**
 * GET /api/admin/users/[userId]/risk
 * User Inspector: risk summary (v_admin_user_risk_summary), last 20 risk assessments, last 20 security events.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 500 });
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });
    }

    const [summaryRes, assessmentsRes, eventsRes, redemptionsRes] = await Promise.all([
      admin.from('v_admin_user_risk_summary').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('tb_risk_assessments').select('id, entity_type, entity_id, risk_score, flags, recommended_action, details, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      admin.from('tb_security_events').select('id, event_type, ip, user_agent, country, created_at, metadata').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      admin.from('tb_reward_redemptions').select('id, status, cost_points, payout_tl, created_at, note').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);

    return NextResponse.json({
      ok: true,
      user_id: userId,
      summary: summaryRes.data ?? null,
      risk_assessments: assessmentsRes.data ?? [],
      security_events: eventsRes.data ?? [],
      redemptions: redemptionsRes.data ?? [],
    });
  } catch (err) {
    console.error('[admin/users/risk]', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
