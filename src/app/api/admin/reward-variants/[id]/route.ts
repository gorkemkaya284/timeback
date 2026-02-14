import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import type { Json } from '@/types/database.types';

/**
 * PATCH /api/admin/reward-variants/:id
 * Body: { denomination_tl?, cost_points?, stock?, daily_limit_per_user?, min_account_age_days?, is_active? }
 */
export async function PATCH(
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

    const body = await request.json();
    const update: Record<string, unknown> = {};
    if (typeof body.denomination_tl === 'number') update.denomination_tl = body.denomination_tl;
    if (typeof body.cost_points === 'number') update.cost_points = body.cost_points;
    if (body.stock !== undefined) update.stock = body.stock;
    if (body.daily_limit_per_user !== undefined) update.daily_limit_per_user = body.daily_limit_per_user;
    if (body.min_account_age_days !== undefined) update.min_account_age_days = body.min_account_age_days;
    if (body.is_active !== undefined) update.is_active = !!body.is_active;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('reward_variants')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Admin reward-variants PATCH:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from('admin_actions').insert({
      actor_id: user.id,
      action: 'update_reward_variant',
      target_type: 'reward_variant',
      target_id: id,
      meta: update as Json,
    });

    return NextResponse.json({ variant: data });
  } catch (err) {
    console.error('Admin reward-variants PATCH:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
