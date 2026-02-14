import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import type { Json } from '@/types/database.types';

/**
 * POST /api/admin/redemptions/:id/reject
 * Body: { reason?: string }
 * Sets status=rejected. Reverses points (ledger credit). Logs admin_actions.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin client disabled. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason?.trim();

    const { data: row, error: updateError } = await admin
      .from('reward_redemptions')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        note: reason || undefined,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('user_id, cost_points')
      .single();

    if (updateError || !row) {
      return NextResponse.json({ error: 'Redemption not found or already processed' }, { status: 400 });
    }

    const userId = (row as { user_id: string }).user_id;
    const costPoints = (row as { cost_points: number }).cost_points;

    const refId = `admin:redeem_reject:${id}`;

    const { error: ledgerError } = await admin.from('points_ledger').insert({
      user_id: userId,
      delta: costPoints,
      type: 'credit',
      reason: 'reward_redeem_reversal',
      ref_type: 'reward_redeem_reversal',
      ref_id: refId,
    });

    if (ledgerError) {
      console.error('Admin redemptions reject ledger:', ledgerError);
      return NextResponse.json(
        { error: 'Points reversal failed: ' + ledgerError.message },
        { status: 500 }
      );
    }

    await admin.from('admin_actions').insert({
      actor_id: user.id,
      action: 'redeem_reject',
      target_type: 'reward_redemption',
      target_id: id,
      meta: { user_id: userId, cost_points: costPoints, reason: reason ?? null } as Json,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin redemptions reject:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
