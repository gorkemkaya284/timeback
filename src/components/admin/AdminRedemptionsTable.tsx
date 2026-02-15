'use client';

import { useEffect, useState } from 'react';

export type AdminRedemption = {
  id: string;
  user_id: string;
  status: string;
  payout_tl: number;
  cost_points: number;
  note: string | null;
  created_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  denomination_tl?: number;
  reward_title?: string;
  reward_kind?: string;
};

export default function AdminRedemptionsTable() {
  const [list, setList] = useState<AdminRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchList = async () => {
    try {
      const res = await fetch('/api/admin/redemptions?status=pending');
      const data = await res.json();
      if (data.ok === false) {
        const msg = data.error?.message ?? data.message ?? data.error ?? 'Liste alınamadı';
        setToast({ type: 'error', message: typeof msg === 'string' ? msg : 'Liste alınamadı' });
        setList([]);
        return;
      }
      setList(data.data ?? data.redemptions ?? []);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Liste alınamadı' });
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/redemptions/${id}/approve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setToast({ type: 'success', message: 'Onaylandı' });
        fetchList();
      } else {
        setToast({ type: 'error', message: data.message || data.error || 'Onaylama başarısız' });
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Onaylama başarısız' });
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectModal({ id });
    setRejectReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    const id = rejectModal.id;
    setRejectModal(null);
    try {
      const res = await fetch(`/api/admin/redemptions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setToast({ type: 'success', message: 'Reddedildi, puan iade edildi' });
        fetchList();
      } else {
        setToast({ type: 'error', message: data.message || data.error || 'Reddetme başarısız' });
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Reddetme başarısız' });
    }
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>;
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}
        >
          {toast.message}
          <button type="button" onClick={() => setToast(null)} className="ml-2 underline">
            Kapat
          </button>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Talebi reddet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Puanlar otomatik iade edilecek.</p>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Sebep (isteğe bağlı)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm mb-4"
              rows={2}
              placeholder="Örn: Eksik bilgi"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Ödül</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">TL</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Puan</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Not</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Durum</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(r.created_at).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[140px]" title={r.user_id}>
                    {r.user_id}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.reward_title ?? '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.payout_tl} TL</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.cost_points} P</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={r.note ?? ''}>
                    {r.note || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{r.status}</td>
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
                      onClick={() => handleRejectClick(r.id)}
                      title="Reddet; puan iade edilir"
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
            <p className="font-medium">Henüz talep yok</p>
            <p className="text-sm mt-1">Onayla: talebi tamamlandı işaretle. Reddet: puan otomatik iade edilir.</p>
          </div>
        )}
      </div>
    </div>
  );
}
