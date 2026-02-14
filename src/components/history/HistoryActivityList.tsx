'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatPoints } from '@/lib/utils';
import { getRedemptionStatusLabel, getRedemptionStatusStyle } from '@/lib/status';

type Filter = 'all' | 'earnings' | 'withdrawals' | 'pending';

type RedemptionStatusLabel = 'Tamamlandı' | 'Beklemede' | 'Reddedildi';

type ActivityItem = {
  id: string;
  date: string;
  type: 'Kazanç' | 'Çekim';
  description: string;
  points: number;
  status: RedemptionStatusLabel;
  isPending: boolean;
};

function mapReasonToDescription(reason: string): string {
  if (reason.startsWith('Redeemed:')) return reason.replace('Redeemed: ', '');
  if (reason.startsWith('Offerwall:')) return reason.replace('Offerwall: ', 'Görev tamamlandı');
  if (reason.includes('admin_credit')) return 'Admin kredisi';
  if (reason.includes('admin_debit')) return 'Admin düzeltmesi';
  if (reason.includes('offer') || reason.includes('conversion')) return 'Görev tamamlandı';
  if (reason.includes('system_check')) return 'Test puanı';
  return reason;
}


type LedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
};

type RedemptionWithReward = {
  id: string;
  status: string;
  points_spent: number;
  created_at: string;
  reward_title?: string;
};

export default function HistoryActivityList({
  ledgerEntries,
  redemptions,
}: {
  ledgerEntries: LedgerEntry[];
  redemptions: RedemptionWithReward[];
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const items: ActivityItem[] = useMemo(() => {
    return ledgerEntries.map((e) => {
      const isCredit = e.delta > 0;
      const redemptionFull = e.ref_type === 'redemption' && e.ref_id
        ? redemptions.find((r) => String(r.id) === String(e.ref_id))
        : null;
      const status: RedemptionStatusLabel = redemptionFull
        ? getRedemptionStatusLabel(redemptionFull.status)
        : isCredit
          ? 'Tamamlandı'
          : 'Beklemede';
      const description = isCredit
        ? mapReasonToDescription(e.reason)
        : (redemptionFull?.reward_title ?? mapReasonToDescription(e.reason));
      return {
        id: e.id,
        date: new Date(e.created_at).toLocaleString('tr-TR'),
        type: isCredit ? 'Kazanç' : 'Çekim',
        description,
        points: Math.abs(e.delta),
        status,
        isPending: status === 'Beklemede',
      };
    });
  }, [ledgerEntries, redemptions]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'earnings') return items.filter((i) => i.type === 'Kazanç');
    if (filter === 'withdrawals') return items.filter((i) => i.type === 'Çekim');
    if (filter === 'pending') return items.filter((i) => i.isPending);
    return items;
  }, [items, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'earnings', label: 'Kazançlar' },
    { id: 'withdrawals', label: 'Çekimler' },
    { id: 'pending', label: 'Bekleyenler' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length === 0
                ? 'Henüz işlem geçmişin yok. Görevleri tamamlayarak kazanmaya başlayabilirsin.'
                : 'Bu filtreye uyan işlem bulunamadı.'}
            </p>
            {items.length === 0 && (
              <Link
                href="/app/earn"
                className="mt-3 inline-block text-sm font-medium text-green-600 dark:text-green-400 hover:underline"
              >
                Görevleri gör
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto hidden lg:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      İşlem tipi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Açıklama
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Puan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map((item) => (
                    <tr key={item.id} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {item.type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                        {item.description}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                          item.type === 'Kazanç'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {item.type === 'Kazanç' ? '+' : '-'}
                        {formatPoints(item.points)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getRedemptionStatusStyle(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.type}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.date}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-semibold ${
                          item.type === 'Kazanç'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {item.type === 'Kazanç' ? '+' : '-'}
                        {formatPoints(item.points)}
                      </p>
                      <span
                        className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded ${getRedemptionStatusStyle(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
