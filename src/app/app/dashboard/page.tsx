import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import { getPointsSummary } from '@/lib/points-ledger';
import { getUserWithdrawals } from '@/server/queries/withdrawals';
import Link from 'next/link';
import DashboardSummaryCards from '@/components/dashboard/DashboardSummaryCards';
import DashboardActivityList from '@/components/dashboard/DashboardActivityList';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { ensureProfile } = await import('@/lib/supabase/profile');
  await ensureProfile(user.id);

  const { totalPoints, recentEntries } = await getPointsSummary(user.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isoToday = todayStart.toISOString();

  const [
    { data: todayRows },
    { data: pendingRedemptions },
    withdrawals,
  ] = await Promise.all([
    supabase
      .from('points_ledger')
      .select('delta')
      .eq('user_id', user.id)
      .gte('created_at', isoToday),
    supabase
      .from('reward_redemptions')
      .select('cost_points')
      .eq('user_id', user.id)
      .eq('status', 'pending'),
    getUserWithdrawals(user.id, { limit: 10 }),
  ]);

  const earnToday = (todayRows ?? []).filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0);
  const pendingEarnings = (pendingRedemptions ?? []).reduce((s, r) => s + ((r as { cost_points?: number }).cost_points ?? 0), 0);
  const lastWithdrawalStatus = withdrawals[0]?.status ?? null;

  const recentWithdrawals = withdrawals.slice(0, 5);
  const earningsOnly = (recentEntries ?? []).filter((e) => e.delta > 0);

  return (
    <div className="min-h-full -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        <section className="pt-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Genel Bakış
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Kazanç ve işlemlerinin özeti
          </p>
        </section>

        <DashboardSummaryCards
          balance={totalPoints}
          todayEarned={earnToday}
          pendingEarnings={pendingEarnings}
          lastRedemptionStatus={lastWithdrawalStatus}
        />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/earn"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            Görevleri gör
          </Link>
          <Link
            href="/app/rewards"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Ödül çek
          </Link>
        </div>

        <DashboardActivityList
          earnings={earningsOnly}
          withdrawals={recentWithdrawals}
        />
      </div>
    </div>
  );
}
