import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import HistoryActivityList from '@/components/history/HistoryActivityList';

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { ensureProfile } = await import('@/lib/supabase/profile');
  await ensureProfile(user.id);

  const { data: ledgerEntries } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: redemptions } = await supabase
    .from('redemptions')
    .select(`
      id,
      status,
      points_spent,
      created_at,
      rewards (title)
    `)
    .eq('user_id', user.id);

  const redemptionsWithTitle = (redemptions ?? []).map((r) => {
    const reward = (r as { rewards?: { title?: string } | null }).rewards;
    return {
      id: r.id,
      status: r.status,
      points_spent: r.points_spent,
      created_at: r.created_at,
      reward_title: reward?.title ?? undefined,
    };
  });

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

        <HistoryActivityList
          ledgerEntries={(ledgerEntries ?? []) as { id: string; delta: number; reason: string; ref_type: string | null; ref_id: string | null; created_at: string }[]}
          redemptions={redemptionsWithTitle}
        />
      </div>
    </div>
  );
}
