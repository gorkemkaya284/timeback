import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { writeAuditLog } from '@/lib/admin-audit';
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !allowAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 200);
    const userId = searchParams.get('user_id')?.trim() || null;

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ entries: [] });
    }

    let query = adminClient
      .from('points_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (userId) query = query.eq('user_id', userId);

    const { data: entries, error } = await query;

    if (error) {
      console.error('[admin/ledger] Fetch error:', { code: error.code, message: error.message, details: error.details });
      return NextResponse.json(
        { error: 'Failed to fetch ledger', message: error.message },
        { status: 500 }
      );
    }

    type LedgerEntry = { user_id: string } & Record<string, unknown>;
    const safeEntries = (entries || []) as LedgerEntry[];
    const entriesWithEmails = await Promise.all(
      safeEntries.map(async (entry) => {
        const { data: authUser } = await adminClient.auth.admin.getUserById(entry.user_id);
        return {
          ...entry,
          email: authUser?.user?.email || 'Unknown',
        };
      })
    );

    return NextResponse.json({ entries: entriesWithEmails });
  } catch (error) {
    console.error('Admin ledger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @deprecated Use POST /api/admin/ledger/adjust instead.
 * Legacy POST: same logic as adjust, accepts { userId, amount, type }.
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

    let body: { userId?: string; amount?: number; type?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, code: 'invalid_json', message: 'Invalid JSON' }, { status: 400 });
    }

    const userId = body.userId?.trim();
    const amt = typeof body.amount === 'number' ? body.amount : parseInt(String(body.amount ?? ''), 10);
    const type = body.type;

    if (!userId) {
      return NextResponse.json({ ok: false, code: 'user_id_required', message: 'userId required' }, { status: 400 });
    }
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ ok: false, code: 'invalid_amount', message: 'amount must be positive' }, { status: 400 });
    }
    if (type !== 'credit' && type !== 'debit') {
      return NextResponse.json({ ok: false, code: 'invalid_type', message: 'type must be credit or debit' }, { status: 400 });
    }

    const delta = type === 'credit' ? amt : -amt;
    const ledgerType = delta > 0 ? 'credit' : 'debit';
    const reason = type === 'credit' ? 'admin_credit' : 'admin_debit';
    const sourceEventId = `admin:${crypto.randomUUID()}`;

    const { data, error } = await adminClient
      .from('points_ledger')
      .insert({
        user_id: userId,
        delta,
        type: ledgerType,
        reason,
        ref_type: 'admin_adjustment',
        ref_id: sourceEventId,
      })
      .select('id')
      .limit(1);

    if (error) {
      console.error('[admin/ledger] Insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const userMessage =
        error.code === '23503'
          ? 'User not found in profiles. Create profile first.'
          : error.code === '23505'
            ? 'Duplicate adjustment. Retry.'
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
      action: type === 'credit' ? 'credit_points' : 'debit_points',
      target_type: 'user',
      target_id: userId,
      payload: { amount: amt, reason, ledger_id: ledgerId },
    });

    return NextResponse.json({ ok: true, success: true, ledger_id: ledgerId });
  } catch (err) {
    console.error('[admin/ledger] POST error:', err);
    return NextResponse.json(
      { ok: false, code: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
