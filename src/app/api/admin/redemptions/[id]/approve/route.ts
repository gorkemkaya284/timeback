import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import type { Json } from '@/types/database.types';

/**
 * POST /api/admin/redemptions/:id/approve
 * tb_reward_redemptions: status=approved, reviewed_by, reviewed_at. Log admin_actions.
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

    const { data: row, error } = await admin
      .from('tb_reward_redemptions')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      console.error('[admin/redemptions/approve] error:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json(
        { error: error.message, code: (error as { code?: string }).code },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json({ error: 'Redemption not found or already processed' }, { status: 400 });
    }

    const r = row as { user_id: string; payout_tl: number };
    await admin.from('admin_actions').insert({
      actor_id: user.id,
      action: 'redeem_approve',
      target_type: 'tb_reward_redemption',
      target_id: id,
      meta: { user_id: r.user_id, payout_tl: r.payout_tl } as Json,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/redemptions/approve] exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
