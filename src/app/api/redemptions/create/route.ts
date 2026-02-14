import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { canUserAct } from '@/lib/utils-server';

/**
 * POST /api/redemptions/create
 * Body: { reward_id: number } or { rewardId: number }
 * User: getCurrentUser() — uses DEV_USER_ID when DEV_MODE.
 * Calls atomic redeem_reward RPC (ledger deduct, stock decrease, redemption record).
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await canUserAct(user.id))) {
      return NextResponse.json({ error: 'Account is banned' }, { status: 403 });
    }

    const body = await request.json();
    const rewardIdRaw = body.reward_id ?? body.rewardId;
    if (rewardIdRaw == null) {
      return NextResponse.json({ error: 'Reward ID required' }, { status: 400 });
    }

    const rewardIdNum = typeof rewardIdRaw === 'string' ? parseInt(rewardIdRaw, 10) : rewardIdRaw;
    if (isNaN(rewardIdNum)) {
      return NextResponse.json({ error: 'Invalid reward ID' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const supabase = await createClient();

    if (adminClient) {
      const minThreshold = parseInt(process.env.MIN_REDEMPTION_THRESHOLD || '100', 10);
      const { data: total } = await adminClient.rpc('get_user_points', { p_user_id: user.id });
      const totalPoints = typeof total === 'number' ? total : 0;
      if (totalPoints < minThreshold) {
        return NextResponse.json(
          { error: `Minimum ${minThreshold} points required to redeem` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase.rpc('redeem_reward', {
      p_reward_id: rewardIdNum,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Redeem RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to process redemption' },
        { status: 500 }
      );
    }

    if (!data || !data.success) {
      const msg = data?.error || 'Redemption failed';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      redemptionId: data.redemption_id,
      pointsSpent: data.points_spent,
      newPoints: data.new_points,
      rewardTitle: data.reward_title,
    });
  } catch (error) {
    console.error('Redemption error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
