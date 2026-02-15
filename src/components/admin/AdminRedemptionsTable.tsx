'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import UserInspectorDrawer from './UserInspectorDrawer';

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
  risk_score?: number;
  risk_flags?: string[];
  risk_action?: 'allow' | 'review' | 'block';
  last_ip?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  fulfilled: 'Tamamlandı',
  canceled: 'İptal',
};

const STATUS_TABS = [
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'fulfilled', label: 'Tamamlandı' },
  { value: 'all', label: 'Tümü' },
] as const;

function formatDateTR(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
    approved: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    fulfilled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    canceled: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-gray-100 dark:bg-gray-700'}`}>
      {label}
    </span>
  );
}

function RiskBadge({ score, action }: { score?: number; action?: string }) {
  if (score == null && !action) return <span className="text-gray-400 text-xs">–</span>;
  const level = action === 'block' || (score != null && score >= 70) ? 'High' : action === 'review' || (score != null && score >= 30) ? 'Medium' : 'Low';
  const styles =
    level === 'High'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      : level === 'Medium'
        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles}`} title={score != null ? `Score: ${score}` : ''}>
      {score != null ? score : level}
    </span>
  );
}

const REFRESH_THROTTLE_MS = 1000;

export default function AdminRedemptionsTable() {
  const [list, setList] = useState<AdminRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<string>('pending');
  const [searchQ, setSearchQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sinceFilter, setSinceFilter] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; fulfilled: number; total: number } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [inspectorUserId, setInspectorUserId] = useState<string | null>(null);
  const lastRefresh = useRef(0);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusTab);
      if (searchQ) params.set('q', searchQ);
      if (riskFilter) params.set('risk', riskFilter);
      if (sinceFilter) {
        const d = new Date();
        if (sinceFilter === '24h') d.setHours(d.getHours() - 24);
        else if (sinceFilter === '7d') d.setDate(d.getDate() - 7);
        params.set('since', d.toISOString());
      }
      params.set('limit', '50');
      const res = await fetch(`/api/admin/redemptions?${params.toString()}`, { cache: 'no-store' });
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
  }, [statusTab, searchQ, riskFilter, sinceFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/redemptions/stats');
      const data = await res.json();
      if (data.ok && data.pending !== undefined) {
        setStats({ pending: data.pending, approved: data.approved, rejected: data.rejected, fulfilled: data.fulfilled ?? 0, total: data.total });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQ(searchInput.trim());
  };

  const copyUserId = (userId: string) => {
    navigator.clipboard.writeText(userId);
    setToast({ type: 'success', message: 'User ID kopyalandı' });
  };

  const handleRefresh = () => {
    const now = Date.now();
    if (now - lastRefresh.current < REFRESH_THROTTLE_MS) return;
    lastRefresh.current = now;
    setRefreshing(true);
    Promise.all([fetchList(), fetchStats()]).finally(() => setRefreshing(false));
  };

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/redemptions/${id}/approve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setToast({ type: 'success', message: 'Onaylandı' });
        await Promise.all([fetchList(), fetchStats()]);
      } else {
        setToast({ type: 'error', message: data.message || data.error || 'Onaylama başarısız' });
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Onaylama başarısız' });
    } finally {
      setActionLoadingId(null);
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
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/redemptions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setToast({ type: 'success', message: 'Reddedildi, puan iade edildi' });
        await Promise.all([fetchList(), fetchStats()]);
      } else {
        setToast({ type: 'error', message: data.message || data.error || 'Reddetme başarısız' });
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Reddetme başarısız' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm flex items-center justify-between ${
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

      <UserInspectorDrawer userId={inspectorUserId} onClose={() => setInspectorUserId(null)} />

      {/* Tabs + filters + search + refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-800/50">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusTab(tab.value)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                statusTab === tab.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {stats && tab.value !== 'all' && (
                <span className="ml-1 text-xs opacity-75">
                  ({tab.value === 'pending' ? stats.pending : tab.value === 'approved' ? stats.approved : tab.value === 'rejected' ? stats.rejected : tab.value === 'fulfilled' ? stats.fulfilled : 0})
                </span>
              )}
            </button>
          ))}
        </div>
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
          <option value="">Risk: Tümü</option>
          <option value="low">0-29</option>
          <option value="medium">30-69</option>
          <option value="high">70+</option>
        </select>
        <select value={sinceFilter} onChange={(e) => setSinceFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
          <option value="">Süre: Tümü</option>
          <option value="24h">Son 24h</option>
          <option value="7d">Son 7 gün</option>
        </select>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="User ID / talep ID"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm min-w-[200px]"
          />
          <button type="submit" className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500">
            Ara
          </button>
        </form>
        <button type="button" onClick={handleRefresh} disabled={refreshing} className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-60">
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Ödül</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Durum</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Risk</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Flag’lar</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">IP</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">İnceleme</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Not</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {list.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setInspectorUserId(r.user_id)}>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTR(r.created_at)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        <span>{r.reward_title ?? '–'}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">{r.payout_tl} TL</span>
                      </td>
                      <td className="px-4 py-2 text-sm" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono text-gray-600 dark:text-gray-400 truncate max-w-[140px] inline-block align-bottom" title={r.user_id}>
                          {r.user_id}
                        </span>
                        <button type="button" onClick={() => copyUserId(r.user_id)} className="ml-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Kopyala">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2">
                        <RiskBadge score={r.risk_score} action={r.risk_action} />
                      </td>
                      <td className="px-4 py-2 text-sm" onClick={(e) => e.stopPropagation()}>
                        {r.last_ip ? <span className="font-mono text-gray-600 dark:text-gray-400" title={r.last_ip}>{r.last_ip}</span> : '–'}
                        {r.last_ip && (
                          <button type="button" onClick={() => { navigator.clipboard.writeText(r.last_ip!); setToast({ type: 'success', message: 'IP kopyalandı' }); }} className="ml-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="IP kopyala">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {r.risk_flags && r.risk_flags.length > 0 ? (
                          <>
                            {r.risk_flags.slice(0, 3).map((f) => (
                              <span key={f} className="mr-1 inline-block rounded bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5">{f}</span>
                            ))}
                            {r.risk_flags.length > 3 ? <span className="text-gray-400">+{r.risk_flags.length - 3}</span> : null}
                          </>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {r.reviewed_at ? formatDateTR(r.reviewed_at) : '–'}
                        {r.reviewed_by && <span className="block text-xs text-gray-400">ID: {r.reviewed_by.slice(0, 8)}…</span>}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={r.note ?? ''}>
                        {r.note || '–'}
                      </td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        {r.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(r.id)}
                              disabled={actionLoadingId !== null}
                              title="Onayla"
                              className="mr-2 px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50 disabled:opacity-50"
                            >
                              {actionLoadingId === r.id ? '…' : 'Onayla'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectClick(r.id)}
                              disabled={actionLoadingId !== null}
                              title="Reddet; puan iade edilir"
                              className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50"
                            >
                              Reddet
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p className="font-medium">Henüz talep yok</p>
                <p className="text-sm mt-1">Bu filtrede kayıt bulunamadı.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
