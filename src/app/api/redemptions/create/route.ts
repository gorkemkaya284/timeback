import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import { canUserAct } from '@/lib/utils-server';
import { getPointsSummary } from '@/lib/points-ledger';
import { MIN_REDEMPTION_POINTS } from '@/config/rewards';

/**
 * POST /api/redemptions/create
 * Body: { reward_id: number } or { rewardId: number }
 * User: getCurrentUser() — uses DEV_USER_ID when DEV_MODE.
 * Balance: getPointsSummary (aynı kaynak ödül sayfasıyla).
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    if (!(await canUserAct(user.id))) {
      return NextResponse.json({ success: false, message: 'Hesabınız kısıtlı' }, { status: 403 });
    }

    const body = await request.json();
    const rewardIdRaw = body.reward_id ?? body.rewardId;
    if (rewardIdRaw == null) {
      return NextResponse.json({ success: false, message: 'Ödül ID gerekli' }, { status: 400 });
    }

    const rewardIdNum = typeof rewardIdRaw === 'string' ? parseInt(rewardIdRaw, 10) : Number(rewardIdRaw);
    if (isNaN(rewardIdNum) || rewardIdNum < 1) {
      return NextResponse.json({ success: false, message: 'Geçersiz ödül ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const { totalPoints: rawBalance } = await getPointsSummary(user.id);
    const balance = Math.max(0, Number(rawBalance) || 0);

    const { data: pendingRedemptions } = await supabase
      .from('redemptions')
      .select('points_spent')
      .eq('user_id', user.id)
      .eq('status', 'pending');
    const pendingPoints = (pendingRedemptions ?? []).reduce((s, r) => s + Number(r.points_spent ?? 0), 0);
    const withdrawable = Math.max(0, balance - pendingPoints);

    const { data: reward } = await supabase
      .from('rewards')
      .select('points_cost')
      .eq('id', String(rewardIdNum))
      .single();
    const required_points = reward?.points_cost != null ? Number(reward.points_cost) : NaN;

    if (isNaN(balance) || (balance === 0 && typeof rawBalance !== 'number')) {
      return NextResponse.json(
        { success: false, message: 'Bakiyen okunamadı. Sayfayı yenile.' },
        { status: 400 }
      );
    }
    if (withdrawable < MIN_REDEMPTION_POINTS) {
      return NextResponse.json(
        { success: false, message: `Minimum çekim: ${MIN_REDEMPTION_POINTS} P` },
        { status: 400 }
      );
    }
    if (isNaN(required_points) || required_points < 1) {
      return NextResponse.json({ success: false, message: 'Ödül bulunamadı' }, { status: 400 });
    }
    if (withdrawable < required_points) {
      return NextResponse.json(
        { success: false, message: `Yetersiz bakiye. Bu ödül için ${Math.floor(required_points)} P gerekir.` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('redeem_reward', {
      p_reward_id: rewardIdNum,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Redeem RPC error:', error);
      return NextResponse.json(
        { success: false, message: 'Çekim işlenemedi', code: 'RPC_ERROR' },
        { status: 500 }
      );
    }

    const rpc = data as { success?: boolean; error?: string; redemption_id?: string; points_spent?: number; new_points?: number; reward_title?: string } | null;
    const ok = rpc && (rpc.success === true || (typeof rpc.success !== 'boolean' && rpc.redemption_id != null));

    if (!ok) {
      const msg = rpc?.error || 'Çekim işlenemedi';
      return NextResponse.json(
        { success: false, message: msg, code: 'REDEEM_FAILED' },
        { status: 400 }
      );
    }

    const redemptionId = rpc?.redemption_id ?? null;
    const pointsSpent = rpc?.points_spent ?? required_points;
    const newPoints = rpc?.new_points ?? Math.max(0, balance - pointsSpent);

    return NextResponse.json({
      success: true,
      redemption: {
        id: redemptionId,
        status: 'pending',
        points: pointsSpent,
      },
      newBalance: newPoints,
      message: 'Çekim talebin alındı',
    }, { status: 200 });
  } catch (error) {
    console.error('Redemption error:', error);
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
