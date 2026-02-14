import Link from 'next/link';
import { formatPoints } from '@/lib/utils';
import {
  normalizeWithdrawalStatus,
  getWithdrawalStatusUI,
  getWithdrawalBadgeClass,
  type WithdrawalStatus,
} from '@/lib/withdrawalStatus';
import type { WithdrawalRow } from '@/server/queries/withdrawals';

type ActivityItem = {
  id: string;
  type: 'kazanç' | 'çekim';
  source: string;
  amount: number;
  date: string;
  created_at: string;
  status: WithdrawalStatus;
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

type EarningsEntry = {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
};

export default function DashboardActivityList({
  earnings,
  withdrawals,
}: {
  earnings: EarningsEntry[];
  withdrawals: WithdrawalRow[];
}) {
  const earningsItems: ActivityItem[] = earnings.map((e) => ({
    id: `earn-${e.id}`,
    type: 'kazanç' as const,
    source: mapReasonToSource(e.reason),
    amount: e.delta,
    date: new Date(e.created_at).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    created_at: e.created_at,
    status: 'paid' as WithdrawalStatus,
  }));

  const withdrawalItems: ActivityItem[] = withdrawals.map((w) => ({
    id: `wd-${w.id}`,
    type: 'çekim' as const,
    source: w.reward_title ?? 'Çekim',
    amount: w.points,
    date: new Date(w.created_at).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    created_at: w.created_at,
    status: normalizeWithdrawalStatus(w.status),
  }));

  const items = [...earningsItems, ...withdrawalItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

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
                  className={`px-2 py-0.5 text-xs font-medium rounded ${getWithdrawalBadgeClass(getWithdrawalStatusUI(item.status).badgeVariant)}`}
                >
                  {getWithdrawalStatusUI(item.status).label}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
