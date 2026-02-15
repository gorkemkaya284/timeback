import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import { getUserWithdrawals } from '@/server/queries/withdrawals';
import HistoryActivityList from '@/components/history/HistoryActivityList';
import MyRedemptionsSection from '@/components/history/MyRedemptionsSection';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { ensureProfile } = await import('@/lib/supabase/profile');
  await ensureProfile(user.id);

  const [withdrawals, { data: ledgerCredits }] = await Promise.all([
    getUserWithdrawals(user.id, { limit: 50 }),
    supabase
      .from('points_ledger')
      .select('id, delta, reason, created_at')
      .eq('user_id', user.id)
      .gt('delta', 0)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const earnings = (ledgerCredits ?? []).map((e) => ({
    id: e.id,
    delta: e.delta,
    reason: e.reason,
    created_at: e.created_at,
  }));

  return (
    <div className="min-h-full -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <section className="pt-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            İşlem geçmişi
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Tüm kazanç ve çekim işlemlerin burada
          </p>
        </section>

        <div className="space-y-6">
          <MyRedemptionsSection />
          <HistoryActivityList earnings={earnings} withdrawals={withdrawals} />
        </div>
      </div>
    </div>
  );
}
