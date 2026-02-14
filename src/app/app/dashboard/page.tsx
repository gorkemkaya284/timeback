import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import { getPointsSummary } from '@/lib/points-ledger';
import Link from 'next/link';
import DashboardSummaryCards from '@/components/dashboard/DashboardSummaryCards';
import DashboardActivityList from '@/components/dashboard/DashboardActivityList';

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
    { data: lastRedemption },
  ] = await Promise.all([
    supabase
      .from('points_ledger')
      .select('delta')
      .eq('user_id', user.id)
      .gte('created_at', isoToday),
    supabase
      .from('redemptions')
      .select('points_spent')
      .eq('user_id', user.id)
      .eq('status', 'pending'),
    supabase
      .from('redemptions')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const earnToday = (todayRows ?? []).filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0);
  const pendingEarnings = (pendingRedemptions ?? []).reduce((s, r) => s + r.points_spent, 0);
  const lastRedemptionStatus = lastRedemption?.status as 'pending' | 'fulfilled' | 'rejected' | null;

  const redemptionsById: Record<string, { id: string; status: string; points_spent: number; created_at: string }> = {};
  const redemptionIds = (recentEntries ?? [])
    .filter((e) => e.ref_type === 'redemption' && e.ref_id)
    .map((e) => e.ref_id!);
  if (redemptionIds.length > 0) {
    const { data: reds } = await supabase
      .from('redemptions')
      .select('id, status, points_spent, created_at')
      .in('id', redemptionIds);
    (reds ?? []).forEach((r: { id: string | number; status: string; points_spent: number; created_at: string }) => {
      redemptionsById[String(r.id)] = { id: String(r.id), status: r.status, points_spent: r.points_spent, created_at: r.created_at };
    });
  }

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
          lastRedemptionStatus={lastRedemptionStatus}
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
          ledgerEntries={recentEntries ?? []}
          redemptionsById={redemptionsById}
        />
      </div>
    </div>
  );
}
