import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { writeAuditLog } from '@/lib/admin-audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !allowAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ rewards: [] });
    }

    const { data: rewards, error } = await adminClient
      .from('rewards')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch rewards' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rewards: rewards || [] });
  } catch (error) {
    console.error('Admin rewards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !allowAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { title, points_cost, stock, status } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title required' },
        { status: 400 }
      );
    }
    const cost = typeof points_cost === 'number' ? points_cost : parseInt(String(points_cost), 10);
    if (isNaN(cost) || cost < 1) {
      return NextResponse.json(
        { error: 'points_cost must be at least 1' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Admin client disabled. Set SUPABASE_SERVICE_ROLE_KEY for admin writes.' },
        { status: 503 }
      );
    }

    const { data: reward, error } = await adminClient
      .from('rewards')
      .insert({
        title: title.trim(),
        points_cost: cost,
        stock: Math.max(0, parseInt(String(stock || 0), 10) || 0),
        status: status === 'inactive' ? 'inactive' : 'active',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create reward' },
        { status: 500 }
      );
    }

    const r = reward as { id: string; title: string; points_cost: number };
    await writeAuditLog({
      actor: user.email || user.id,
      action: 'create_reward',
      target_type: 'reward',
      target_id: String(r.id),
      payload: { title: r.title, points_cost: r.points_cost },
    });

    return NextResponse.json({ reward });
  } catch (error) {
    console.error('Admin create reward error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !allowAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rewardId = searchParams.get('id');

    if (!rewardId) {
      return NextResponse.json(
        { error: 'Reward ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.points_cost !== undefined) updateData.points_cost = Math.max(1, parseInt(String(body.points_cost), 10) || 0);
    if (body.stock !== undefined) updateData.stock = Math.max(0, parseInt(String(body.stock), 10) || 0);
    if (body.status !== undefined) updateData.status = body.status === 'inactive' ? 'inactive' : 'active';

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Admin client disabled. Set SUPABASE_SERVICE_ROLE_KEY for admin writes.' },
        { status: 503 }
      );
    }

    const { data: reward, error } = await adminClient
      .from('rewards')
      .update(updateData)
      .eq('id', rewardId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update reward' },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actor: user.email || user.id,
      action: 'update_reward',
      target_type: 'reward',
      target_id: rewardId,
      payload: updateData,
    });

    return NextResponse.json({ reward });
  } catch (error) {
    console.error('Admin update reward error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
