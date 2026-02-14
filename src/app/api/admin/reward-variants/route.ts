import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import type { Json } from '@/types/database.types';

/**
 * POST /api/admin/reward-variants
 * Body: { reward_id, denomination_tl, cost_points?, stock?, daily_limit_per_user?, min_account_age_days?, is_active? }
 * cost_points auto: denomination_tl * 100 if not provided
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin client disabled. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const rewardId = body.reward_id ?? body.rewardId;
    const denominationTl = typeof body.denomination_tl === 'number' ? body.denomination_tl : parseInt(String(body.denomination_tl ?? 0), 10);

    if (!rewardId) {
      return NextResponse.json({ error: 'reward_id required' }, { status: 400 });
    }
    if (isNaN(denominationTl) || denominationTl < 1) {
      return NextResponse.json({ error: 'denomination_tl must be >= 1' }, { status: 400 });
    }

    const costPoints =
      typeof body.cost_points === 'number'
        ? body.cost_points
        : denominationTl * 100;

    const { data, error } = await admin
      .from('reward_variants')
      .insert({
        reward_id: rewardId,
        denomination_tl: denominationTl,
        cost_points: costPoints,
        stock: body.stock != null ? body.stock : null,
        daily_limit_per_user: body.daily_limit_per_user ?? null,
        min_account_age_days: body.min_account_age_days ?? null,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('Admin reward-variants create:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from('admin_actions').insert({
      actor_id: user.id,
      action: 'create_reward_variant',
      target_type: 'reward_variant',
      target_id: data.id,
      meta: { reward_id: rewardId, denomination_tl: denominationTl, cost_points: costPoints } as Json,
    });

    return NextResponse.json({ variant: data });
  } catch (err) {
    console.error('Admin reward-variants POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
