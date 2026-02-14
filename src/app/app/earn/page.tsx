import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import { getPointsSummary } from '@/lib/points-ledger';
import EarningOverviewBar from '@/components/earn/EarningOverviewBar';
import FeaturedOffersCarousel from '@/components/earn/FeaturedOffersCarousel';
import OfferwallsGrid from '@/components/earn/OfferwallsGrid';

export default async function EarnPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { totalPoints } = await getPointsSummary(user.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isoToday = todayStart.toISOString();

  const { data: todayRows } = await supabase
    .from('points_ledger')
    .select('delta')
    .eq('user_id', user.id)
    .gte('created_at', isoToday);

  const earnToday = (todayRows ?? []).filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0);

  const iframeSrc =
    process.env.OFFERWALL_PROVIDER &&
    process.env.OFFERWALL_IFRAME_URL_TEMPLATE &&
    user?.id
      ? process.env.OFFERWALL_IFRAME_URL_TEMPLATE.replace('{USER_ID}', user.id)
      : null;

  return (
    <div className="min-h-full -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Copy */}
        <section className="pt-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Kazanmaya başla
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Görevleri tamamla, puan kazan. Kazancını anında ödüle çevir.
          </p>
          <div className="mt-4 flex flex-wrap gap-6">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
              <span className="text-green-500">●</span> Anında yansıma
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
              <span className="text-sky-500">●</span> Güvenli sistem
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
              <span className="text-emerald-500">●</span> Canlı destek
            </span>
          </div>
        </section>

        {/* Earning Overview Bar */}
        <EarningOverviewBar
          balance={totalPoints}
          todayEarned={earnToday}
          pending={0}
        />

        {/* Öne çıkan görevler */}
        <FeaturedOffersCarousel />

        {/* Tüm görev sağlayıcılar */}
        <OfferwallsGrid iframeSrc={iframeSrc} />

        {/* Nasıl çalışır */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Nasıl çalışır
          </h2>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            <li className="flex gap-2">
              <span className="shrink-0 text-gray-400 dark:text-gray-500">•</span>
              <span>Görevler tamamlandığında puanlar otomatik olarak bakiyene eklenir</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-gray-400 dark:text-gray-500">•</span>
              <span>Bazı görevler doğrulama gerektirebilir (genelde 24–48 saat içinde)</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-gray-400 dark:text-gray-500">•</span>
              <span>Haksız kazançlar iptal edilir</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
