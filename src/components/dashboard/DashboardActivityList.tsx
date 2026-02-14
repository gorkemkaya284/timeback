import Link from 'next/link';
import { formatPoints } from '@/lib/utils';
import { getRedemptionStatusLabel, getRedemptionStatusStyle } from '@/lib/status';

type RedemptionStatusLabel = 'Tamamlandı' | 'Beklemede' | 'Reddedildi';

type ActivityItem = {
  id: string;
  type: 'kazanç' | 'çekim';
  source: string;
  amount: number;
  date: string;
  status: RedemptionStatusLabel;
};

function mapReasonToSource(reason: string): string {
  if (reason.startsWith('Offerwall:')) {
    const match = reason.match(/Offerwall:\s*(\w+)/);
    return match ? match[1] : 'AdGate';
  }
  if (reason.includes('offerwall') || reason.includes('Offerwall')) return 'AdGate';
  if (reason.includes('admin_credit') || reason.includes('admin_debit')) return 'Admin';
  if (reason.startsWith('Redeemed:')) return 'Çekim';
  if (reason.includes('offer') || reason.includes('conversion')) return 'Görev';
  if (reason.includes('system_check')) return 'Sistem';
  return 'Diğer';
}


type LedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
};

type RedemptionRow = {
  id: string;
  status: string;
  points_spent: number;
  created_at: string;
};

export default function DashboardActivityList({
  ledgerEntries,
  redemptionsById,
}: {
  ledgerEntries: LedgerEntry[];
  redemptionsById: Record<string, RedemptionRow>;
}) {
  const items: ActivityItem[] = ledgerEntries.slice(0, 5).map((e) => {
    const isCredit = e.delta > 0;
    const status: RedemptionStatusLabel =
      e.ref_type === 'redemption' && e.ref_id && redemptionsById[String(e.ref_id)]
        ? getRedemptionStatusLabel(redemptionsById[String(e.ref_id)].status)
        : e.delta > 0
          ? 'Tamamlandı'
          : 'Beklemede';
    return {
      id: e.id,
      type: isCredit ? 'kazanç' : 'çekim',
      source: mapReasonToSource(e.reason),
      amount: Math.abs(e.delta),
      date: new Date(e.created_at).toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status,
    };
  });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Son aktiviteler
        </h2>
        <Link
          href="/app/history"
          className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline"
        >
          Tümünü gör
        </Link>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Henüz işlem yok.{' '}
            <Link href="/app/earn" className="text-green-600 dark:text-green-400 font-medium hover:underline">
              Görevleri gör
            </Link>{' '}
            veya{' '}
            <Link href="/app/rewards" className="text-green-600 dark:text-green-400 font-medium hover:underline">
              ödül çek
            </Link>.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {item.type}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.source}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.date}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-sm font-semibold ${
                    item.type === 'kazanç'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.type === 'kazanç' ? '+' : '-'}{formatPoints(item.amount)}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${getRedemptionStatusStyle(item.status)}`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
