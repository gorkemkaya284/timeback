'use client';

import { useEffect, useState } from 'react';

type Redemption = {
  id: string;
  user_id: string;
  reward_variant_id: string;
  cost_points: number;
  payout_tl: number;
  status: string;
  idempotency_key: string;
  note: string | null;
  created_at: string;
};

export default function AdminRedemptionsTable() {
  const [list, setList] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    try {
      const res = await fetch('/api/admin/redemptions?status=pending');
      const data = await res.json();
      if (res.ok) setList(data.redemptions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/admin/redemptions/${id}/approve`, { method: 'POST' });
    if (res.ok) fetchList();
  };

  const handleReject = async (id: string, reason?: string) => {
    if (!window.confirm('Bu talebi reddetmek istediğinize emin misiniz? Puanlar otomatik iade edilecek.')) return;
    const res = await fetch(`/api/admin/redemptions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || undefined }),
    });
    if (res.ok) fetchList();
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">TL</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Puan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Not</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{r.id}</td>
                <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{r.user_id}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.payout_tl} TL</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.cost_points} P</td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{r.note || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(r.created_at).toLocaleString('tr-TR')}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(r.id)}
                    title="Onayla"
                    className="mr-2 px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(r.id)}
                    title="Reddet; puan otomatik iade edilir"
                    className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50"
                  >
                    Reddet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p className="font-medium">Bekleyen çekim talebi yok</p>
          <p className="text-sm mt-1">Onayla: talebi tamamlandı işaretle. Reddet: puan otomatik iade edilir.</p>
        </div>
      )}
    </div>
  );
}
