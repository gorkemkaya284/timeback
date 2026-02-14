'use client';

import { useEffect, useState } from 'react';
import { getRedemptionStatusLabel, getRedemptionStatusStyle } from '@/lib/status';

type Redemption = {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  created_at: string;
};

export default function AdminRedemptionsTable() {
  const [list, setList] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    try {
      const res = await fetch('/api/admin/redemptions');
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

  const [modal, setModal] = useState<{ id: string; status: 'fulfilled' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');

  const openModal = (redemptionId: string, status: 'fulfilled' | 'rejected') => {
    if (status === 'rejected' && !window.confirm('Bu talebi reddetmek istediğinize emin misiniz? Puanlar otomatik iade edilmez.')) return;
    setModal({ id: redemptionId, status });
    setNote('');
  };

  const closeModal = () => setModal(null);

  const submitStatus = async () => {
    if (!modal) return;
    const res = await fetch('/api/admin/redemptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redemptionId: modal.id, status: modal.status, adminNote: note.trim() || undefined }),
    });
    if (res.ok) {
      closeModal();
      fetchList();
    }
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
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Reward ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Puan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Durum</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400">{r.id}</td>
                <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{r.user_id}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.reward_id}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.points_spent}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getRedemptionStatusStyle(getRedemptionStatusLabel(r.status))}`}>
                    {getRedemptionStatusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(r.created_at).toLocaleString('tr-TR')}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => openModal(r.id, 'fulfilled')}
                    title="Tamamlandı olarak işaretle"
                    className="mr-2 px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(r.id, 'rejected')}
                    title="Reddet; puan otomatik iade edilmez"
                    className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
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
          <p className="text-sm mt-1">Onaylamak veya reddetmek için bekleyen talepler burada görünür. Onayla ile tamamlandı işaretle; Reddet puan iadesi yapmaz.</p>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 w-full max-w-md">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              {modal.status === 'fulfilled' ? 'Onayla' : 'Reddet'} — Not (isteğe bağlı)
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Kullanıcıya görüntülenecek not..."
              rows={3}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <button type="button" onClick={closeModal} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                İptal
              </button>
              <button type="button" onClick={submitStatus} className="px-3 py-1.5 text-sm rounded bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium">
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
