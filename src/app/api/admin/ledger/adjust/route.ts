import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { writeAuditLog } from '@/lib/admin-audit';

/**
 * POST /api/admin/ledger/adjust
 * Admin manual credit/debit (ledger reversal for debit).
 * Server-side only; uses Supabase service role.
 */
export async function POST(request: Request) {
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

    const reason = body.reason?.trim() || (pointsDelta > 0 ? 'admin_credit' : 'admin_debit');
    const note = body.note?.trim() || null;

    const adjustmentId = crypto.randomUUID();
    const refId = `admin:${adjustmentId}`;

    const { data, error } = await adminClient
      .from('points_ledger')
      .insert({
        user_id: userId,
        delta: pointsDelta,
        reason,
        ref_type: 'admin_adjustment',
        ref_id: refId,
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
            : error.message || 'Failed to create ledger entry';
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
      payload: { points_delta: pointsDelta, reason, note, adjustment_id: adjustmentId, ledger_id: ledgerId },
    });

    return NextResponse.json({ ok: true, ledger_id: ledgerId });
  } catch (err) {
    console.error('[admin/ledger/adjust] Error:', err);
    return NextResponse.json(
      { ok: false, code: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
