import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import type { Json } from '@/types/database.types';

/**
 * GET /api/admin/rewards
 * Returns rewards + variants (all, active and inactive). Service role.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ rewards: [], variants: [] });
    }

    const { data: rewards, error: rewardsError } = await admin
      .from('rewards')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (rewardsError) {
      console.error('Admin rewards fetch:', rewardsError);
      return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
    }

    const { data: variants, error: variantsError } = await admin
      .from('reward_variants')
      .select('*')
      .order('denomination_tl', { ascending: true });

    if (variantsError) {
      console.error('Admin variants fetch:', variantsError);
      return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
    }

    return NextResponse.json({
      rewards: rewards ?? [],
      variants: variants ?? [],
    });
  } catch (err) {
    console.error('Admin rewards GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/rewards
 * Body: { title, provider?, kind?, image_url?, is_active?, sort_order? }
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
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('rewards')
      .insert({
        title,
        provider: body.provider ?? 'manual',
        kind: body.kind ?? 'gift',
        image_url: body.image_url ?? null,
        is_active: body.is_active !== false,
        sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Admin rewards create:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from('admin_actions').insert({
      actor_id: user.id,
      action: 'create_reward',
      target_type: 'reward',
      target_id: data.id,
      meta: { title, kind: data.kind } as Json,
    });

    return NextResponse.json({ reward: data });
  } catch (err) {
    console.error('Admin rewards POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
