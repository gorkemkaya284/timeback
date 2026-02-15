'use client';

import { useEffect, useState } from 'react';

type RedemptionItem = {
  id: string;
  status: string;
  payout_tl: number;
  cost_points: number;
  created_at: string;
  reward_title: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  fulfilled: 'Tamamlandı',
  canceled: 'İptal',
};

const BADGE_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
  approved: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  fulfilled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  canceled: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

function formatDateTR(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MyRedemptionsSection() {
  const [list, setList] = useState<RedemptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me/redemptions')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok && Array.isArray(data.data)) setList(data.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          Çekim Geçmişim
        </h2>
        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</div>
      </section>
    );
  }

  if (list.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          Çekim Geçmişim
        </h2>
        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Henüz çekim talebiniz yok.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        Çekim Geçmişim
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Ödül</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">TL / Puan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateTR(r.created_at)}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.reward_title ?? '–'}</td>
                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-right">
                  {r.payout_tl} TL <span className="text-gray-400">/ {r.cost_points} P</span>
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASS[r.status] ?? 'bg-gray-100 dark:bg-gray-700'}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
