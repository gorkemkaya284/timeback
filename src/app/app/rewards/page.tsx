import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import { getPointsSummary } from '@/lib/points-ledger';
import { MIN_REDEMPTION_POINTS } from '@/config/rewards';
import RewardsFeedbackBanner from '@/components/rewards/RewardsFeedbackBanner';
import RewardsList from '@/components/rewards/RewardsList';
import WithdrawBalanceBar from '@/components/rewards/WithdrawBalanceBar';
import SonCekimler from '@/components/rewards/SonCekimler';

export default async function RewardsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { ensureProfile } = await import('@/lib/supabase/profile');
  await ensureProfile(user.id);

  const { data: rewards, error: rewardsError } = await supabase
    .from('rewards')
    .select('*')
    .order('points_cost', { ascending: true });

  const { totalPoints: userPoints } = await getPointsSummary(user.id);

  const { data: pendingRedemptions } = await supabase
    .from('redemptions')
    .select('points_spent')
    .eq('user_id', user.id)
    .eq('status', 'pending');

  const pendingPoints = (pendingRedemptions ?? []).reduce((s, r) => s + r.points_spent, 0);
  const withdrawable = Math.max(0, userPoints - pendingPoints);

  const list = rewards ?? [];

  return (
    <div className="min-h-full -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        <Suspense fallback={null}>
          <RewardsFeedbackBanner />
        </Suspense>

        <section className="pt-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ödül çek
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Kazandığın puanları dilediğin ödüle çevir.
          </p>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Tüm çekimler güvenlik kontrollerinden geçer ve genellikle birkaç dakika içinde tamamlanır.
          </p>
        </section>

        <WithdrawBalanceBar
          balance={userPoints}
          withdrawable={withdrawable}
          pending={pendingPoints}
        />

        {rewardsError ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center text-sm text-red-600 dark:text-red-400">
            Yüklenemedi. Sayfayı yenile.
          </div>
        ) : (
          <RewardsList
            rewards={list.map((r) => ({
              id: Number(r.id),
              title: r.title,
              description: r.description ?? null,
              points_cost: r.points_cost,
              stock: r.stock,
              status: r.status,
            }))}
            userPoints={userPoints}
            withdrawable={withdrawable}
            minPoints={MIN_REDEMPTION_POINTS}
          />
        )}

        <SonCekimler />
      </div>
    </div>
  );
}
