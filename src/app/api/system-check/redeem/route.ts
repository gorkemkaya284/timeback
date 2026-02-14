import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/dev';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { canUserAct } from '@/lib/utils-server';

/**
 * POST /api/system-check/redeem — redeem cheapest active reward for current user (test only).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await canUserAct(user.id))) {
    return NextResponse.json({ error: 'Account is banned' }, { status: 403 });
  }

  const admin = getAdminClient();
  const supabase = await createClient();

  const client = admin ?? supabase;
  const { data: rewards, error: rewardsError } = await client
    .from('rewards')
    .select('id, points_cost')
    .eq('status', 'active')
    .order('points_cost', { ascending: true })
    .limit(1);

  if (rewardsError || !rewards?.length) {
    return NextResponse.json(
      { error: 'No active reward found' },
      { status: 404 }
    );
  }

  const reward = rewards[0];
  const rewardId = typeof reward.id === 'number' ? reward.id : parseInt(String(reward.id), 10);
  if (Number.isNaN(rewardId)) {
    return NextResponse.json(
      { error: 'Invalid reward id' },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.rpc('redeem_reward', {
    p_reward_id: rewardId,
    p_user_id: user.id,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Redeem failed' },
      { status: 500 }
    );
  }

  if (!data?.success) {
    return NextResponse.json(
      { error: data?.error ?? 'Redemption failed' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Çekim yapıldı: ${data.reward_title ?? rewardId}, ${data.points_spent ?? 0} puan`,
  });
}
