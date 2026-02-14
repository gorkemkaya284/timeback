import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { writeAuditLog } from '@/lib/admin-audit';
import { logUserIp } from '@/lib/user-ip-log';

/**
 * POST /api/admin/ledger/adjust
 * Admin manual credit/debit (ledger reversal for debit).
 * Server-side only; uses Supabase service role.
 */
export async function POST(request: Request) {
  const logAdminIp = (userId: string) => {
    logUserIp({ req: request, userId, event: 'admin_ledger_adjust' }).catch(() => {});
  };
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, code: 'unauthorized', message: 'Unauthorized' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { ok: false, code: 'admin_disabled', message: 'Admin client disabled. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      );
    }

    let body: { user_id?: string; points_delta?: number; reason?: string; note?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, code: 'invalid_json', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const userId = body.user_id?.trim();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { ok: false, code: 'user_id_required', message: 'user_id required' },
        { status: 400 }
      );
    }

    const rawDelta = body.points_delta;
    const pointsDelta =
      typeof rawDelta === 'number'
        ? Math.round(rawDelta)
        : parseInt(String(rawDelta ?? ''), 10);
    if (isNaN(pointsDelta) || pointsDelta === 0) {
      return NextResponse.json(
        { ok: false, code: 'invalid_delta', message: 'points_delta must be a non-zero number' },
        { status: 400 }
      );
    }

    const type = pointsDelta > 0 ? 'credit' : 'debit';
    const reason = body.reason?.trim() || (type === 'credit' ? 'admin_credit' : 'admin_debit');
    const note = body.note?.trim() || null;

    const sourceEventId = `admin:${crypto.randomUUID()}`;

    const { data, error } = await adminClient
      .from('points_ledger')
      .insert({
        user_id: userId,
        delta: pointsDelta,
        type,
        reason,
        ref_type: 'admin_adjustment',
        ref_id: sourceEventId,
      })
      .select('id')
      .limit(1);

    if (error) {
      console.error('[admin/ledger/adjust] Insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const userMessage =
        error.code === '23503'
          ? 'User not found in profiles. Create profile first.'
          : error.code === '23505'
            ? 'Duplicate adjustment (unique violation). Retry with different id.'
            : error.message;
      return NextResponse.json(
        { ok: false, code: error.code ?? 'db_error', message: userMessage },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : data ? [data] : [];
    const ledgerId = (rows[0] as { id?: string })?.id ?? null;

    await writeAuditLog({
      actor: user.email || user.id,
      action: pointsDelta > 0 ? 'credit_points' : 'debit_points',
      target_type: 'user',
      target_id: userId,
      payload: { points_delta: pointsDelta, reason, note, source_event_id: sourceEventId, ledger_id: ledgerId },
    });

    logAdminIp(user.id);

    return NextResponse.json({ ok: true, ledger_id: ledgerId });
  } catch (err) {
    console.error('[admin/ledger/adjust] Error:', err);
    return NextResponse.json(
      { ok: false, code: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
