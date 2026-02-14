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
      return NextResponse.json({ success: false, error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    if (!(await canUserAct(user.id))) {
      return NextResponse.json({ success: false, error: 'Hesabınız kısıtlı' }, { status: 403 });
    }

    const body = await request.json();
    const rewardIdRaw = body.reward_id ?? body.rewardId;
    if (rewardIdRaw == null) {
      return NextResponse.json({ success: false, error: 'Ödül ID gerekli' }, { status: 400 });
    }

    const rewardIdNum = typeof rewardIdRaw === 'string' ? parseInt(rewardIdRaw, 10) : Number(rewardIdRaw);
    if (isNaN(rewardIdNum) || rewardIdNum < 1) {
      return NextResponse.json({ success: false, error: 'Geçersiz ödül ID' }, { status: 400 });
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
        { success: false, error: 'Bakiyen okunamadı. Sayfayı yenile.' },
        { status: 400 }
      );
    }
    if (withdrawable < MIN_REDEMPTION_POINTS) {
      return NextResponse.json(
        { success: false, error: `Minimum çekim: ${MIN_REDEMPTION_POINTS} P` },
        { status: 400 }
      );
    }
    if (isNaN(required_points) || required_points < 1) {
      return NextResponse.json({ success: false, error: 'Ödül bulunamadı' }, { status: 400 });
    }
    if (withdrawable < required_points) {
      return NextResponse.json(
        { success: false, error: `Yetersiz bakiye. Bu ödül için ${Math.floor(required_points)} P gerekir.` },
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
        { success: false, error: 'Çekim işlenemedi' },
        { status: 500 }
      );
    }

    const ok = data && (data as { success?: boolean }).success === true;
    if (!ok) {
      const msg = (data as { error?: string })?.error || 'Çekim işlenemedi';
      return NextResponse.json(
        { success: false, error: msg },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      redemptionId: (data as { redemption_id?: string }).redemption_id,
      pointsSpent: (data as { points_spent?: number }).points_spent,
      newPoints: (data as { new_points?: number }).new_points,
      rewardTitle: (data as { reward_title?: string }).reward_title,
    });
  } catch (error) {
    console.error('Redemption error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
