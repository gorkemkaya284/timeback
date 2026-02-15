'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import UserInspectorDrawer from './UserInspectorDrawer';
import { createClient } from '@/lib/supabase/client';

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
  user_email?: string | null;
  status_version?: number;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  processing: 'İşleniyor',
  rejected: 'Reddedildi',
  fulfilled: 'Tamamlandı',
  canceled: 'İptal',
};

const STATUS_TABS = [
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'processing', label: 'İşleniyor' },
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
    processing: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200',
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkNote, setBulkNote] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const lastRefresh = useRef(0);

  const getRiskFlags = (row: AdminRedemption): string[] => {
    const raw = row.risk_flags;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const isLocked = (row: AdminRedemption) => {
    if (row.note === 'risk_block') return true;
    if (row.risk_score != null && row.risk_score >= 80) return true;
    if (getRiskFlags(row).includes('multi_account_same_ip')) return true;
    return false;
  };
  const getLockReason = (row: AdminRedemption) => {
    if (row.note === 'risk_block') return 'risk_block';
    if (row.risk_score != null && row.risk_score >= 80) return 'risk';
    if (getRiskFlags(row).includes('multi_account_same_ip')) return 'multi_account_same_ip';
    return '';
  };
  const selectableRows = list.filter((r) => r.status === 'pending' && !isLocked(r));
  const selectableIds = new Set(selectableRows.map((r) => r.id));
  const isSelectable = (row: AdminRedemption) => row.status === 'pending' && !isLocked(row);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectableIds.has(id)) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) setSelectedIds(selectableRows.map((r) => r.id));
    else setSelectedIds([]);
  };

  const clearSelection = () => setSelectedIds([]);

  const runBulkUpdate = async (p_to_status: 'approved' | 'rejected') => {
    if (selectedIds.length === 0 || bulkLoading) return;
    const msg = p_to_status === 'approved'
      ? `${selectedIds.length} talep onaylanacak. Devam?`
      : `${selectedIds.length} talep reddedilecek. Devam?`;
    if (!window.confirm(msg)) return;
    setBulkLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setToast({ type: 'error', message: 'Oturum yok. Lütfen tekrar giriş yapın.' });
        setBulkLoading(false);
        return;
      }
      const { data, error } = await (supabase as any).rpc('admin_bulk_update_redemption_status', {
        p_ids: selectedIds,
        p_to_status,
        p_note: bulkNote.trim() || null,
      });
      if (error) {
        setToast({ type: 'error', message: `RPC hata: ${error.message ?? JSON.stringify(error)}` });
        setBulkLoading(false);
        return;
      }
      if (data?.ok !== true) {
        setToast({ type: 'error', message: data?.message ?? 'RPC başarısız' });
        setBulkLoading(false);
        return;
      }
      const results = Array.isArray(data.results) ? data.results : [];
      const successCount = results.filter((r: { ok?: boolean }) => r?.ok).length;
      const failed = results.filter((r: { ok?: boolean }) => !r?.ok);
      const failCount = failed.length;
      setSelectedIds([]);
      await Promise.all([fetchList(), fetchStats()]);
      if (failCount === 0) {
        setToast({ type: 'success', message: `${successCount} talep ${p_to_status === 'approved' ? 'onaylandı' : 'reddedildi'}.` });
      } else {
        const first3 = failed.slice(0, 3).map((r: { id?: string; error?: string }) => `${r?.id ?? '?'}: ${r?.error ?? 'error'}`).join('; ');
        setToast({
          type: 'error',
          message: `Başarılı: ${successCount}, Hatalı: ${failCount}. İlk hatalar: ${first3}`,
        });
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Toplu işlem başarısız' });
    } finally {
      setBulkLoading(false);
    }
  };

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

  const handleMarkProcessing = async (r: AdminRedemption) => {
    if (r.status !== 'approved' || isLocked(r)) return;
    setActionLoadingId(r.id);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('session user', sessionData.session?.user?.id);
      if (!sessionData.session) {
        setToast({ type: 'error', message: 'Oturum yok. Lütfen tekrar giriş yapın.' });
        setActionLoadingId(null);
        return;
      }
      const { data, error } = await (supabase as any).rpc('admin_update_redemption_status', {
        p_redemption_id: r.id,
        p_to_status: 'processing',
        p_note: null,
        p_expected_version: (r as { status_version?: number }).status_version ?? 0,
      });
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (error || result?.ok !== true) {
        setToast({ type: 'error', message: (result?.message ?? error?.message) || 'İşleniyor yapılamadı' });
        return;
      }
      setToast({ type: 'success', message: 'İşleniyor olarak işaretlendi' });
      await Promise.all([fetchList(), fetchStats()]);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'İşlem başarısız' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkPaid = async (r: AdminRedemption) => {
    if (r.status !== 'processing' || isLocked(r)) return;
    const externalRef = window.prompt('Dış referans (ödeme fişi / transfer ID):');
    if (externalRef == null) return;
    if (!String(externalRef).trim()) {
      setToast({ type: 'error', message: 'Dış referans zorunludur' });
      return;
    }
    setActionLoadingId(r.id);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setToast({ type: 'error', message: 'Oturum yok. Lütfen tekrar giriş yapın.' });
        setActionLoadingId(null);
        return;
      }
      const { data, error } = await (supabase as any).rpc('admin_mark_redemption_paid', {
        p_redemption_id: r.id,
        p_external_ref: String(externalRef).trim(),
        p_note: null,
        p_expected_version: (r as { status_version?: number }).status_version ?? 0,
      });
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (error || result?.ok !== true) {
        setToast({ type: 'error', message: (result?.message ?? error?.message) || 'Ödendi işaretlenemedi' });
        return;
      }
      setToast({ type: 'success', message: 'Ödendi olarak işaretlendi' });
      await Promise.all([fetchList(), fetchStats()]);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'İşlem başarısız' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const runBulkMarkProcessing = async () => {
    const selectedRows = list.filter((r) => selectedIds.includes(r.id));
    const allApproved = selectedRows.length > 0 && selectedRows.every((r) => r.status === 'approved' && !isLocked(r));
    if (!allApproved || selectedIds.length === 0 || bulkLoading) return;
    if (!window.confirm(`${selectedIds.length} talep "İşleniyor" yapılacak. Devam?`)) return;
    setBulkLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setToast({ type: 'error', message: 'Oturum yok. Lütfen tekrar giriş yapın.' });
        setBulkLoading(false);
        return;
      }
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];
      for (const id of selectedIds) {
        const r = list.find((x) => x.id === id);
        const version = (r as { status_version?: number })?.status_version ?? 0;
        const { data, error } = await (supabase as any).rpc('admin_update_redemption_status', {
          p_redemption_id: id,
          p_to_status: 'processing',
          p_note: bulkNote.trim() || null,
          p_expected_version: version,
        });
        const result = typeof data === 'string' ? JSON.parse(data) : data;
        if (error || result?.ok !== true) {
          failCount++;
          if (errors.length < 3) errors.push(`${id}: ${result?.message ?? error?.message ?? 'error'}`);
        } else {
          successCount++;
        }
      }
      setSelectedIds([]);
      await Promise.all([fetchList(), fetchStats()]);
      if (failCount === 0) {
        setToast({ type: 'success', message: `${successCount} talep işleniyor yapıldı.` });
      } else {
        setToast({
          type: 'error',
          message: `Başarılı: ${successCount}, Hatalı: ${failCount}. ${errors.join('; ')}`,
        });
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Toplu işlem başarısız' });
    } finally {
      setBulkLoading(false);
    }
  };

  const selectedRows = list.filter((r) => selectedIds.includes(r.id));
  const bulkAllApproved = selectedRows.length > 0 && selectedRows.every((r) => r.status === 'approved' && !isLocked(r));

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

      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/95 px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Seçili: <strong>{selectedIds.length}</strong>
          </span>
          <input
            type="text"
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
            placeholder="Not (opsiyonel)"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm w-48"
          />
          <button
            type="button"
            onClick={() => runBulkUpdate('approved')}
            disabled={bulkLoading}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {bulkLoading ? 'İşleniyor…' : 'Toplu Onayla'}
          </button>
          <button
            type="button"
            onClick={() => runBulkUpdate('rejected')}
            disabled={bulkLoading}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Toplu Reddet
          </button>
          {bulkAllApproved && (
            <button
              type="button"
              onClick={runBulkMarkProcessing}
              disabled={bulkLoading}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {bulkLoading ? 'İşleniyor…' : 'Toplu İşleniyor Yap'}
            </button>
          )}
          <button
            type="button"
            onClick={clearSelection}
            disabled={bulkLoading}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
          >
            Seçimi temizle
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-10">
                      <input
                        type="checkbox"
                        checked={selectableRows.length > 0 && selectableRows.every((r) => selectedIds.includes(r.id))}
                        onChange={toggleSelectAll}
                        onClick={(e) => e.stopPropagation()}
                        title="Tümünü seç (sadece beklemede)"
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </th>
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
                  {list.map((r) => {
                    const selectable = isSelectable(r);
                    const locked = isLocked(r);
                    const lockReason = getLockReason(r);
                    return (
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${locked ? 'opacity-60' : ''}`}
                      onClick={() => setInspectorUserId(r.user_id)}
                      title={locked ? `Kilitli: ${lockReason}` : undefined}
                    >
                      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          disabled={!selectable}
                          onChange={() => {}}
                          onClick={(e) => toggleSelect(r.id, e as unknown as React.MouseEvent)}
                          title={!selectable ? (locked ? `Kilitli: ${lockReason}` : 'Sadece beklemede seçilebilir') : 'Seç'}
                          className="rounded border-gray-300 dark:border-gray-600 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTR(r.created_at)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        <span>{r.reward_title ?? '–'}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">{r.payout_tl} TL</span>
                      </td>
                      <td className="px-4 py-2 text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col min-w-0 max-w-[180px]">
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate" title={r.user_email ?? undefined}>
                            {r.user_email ?? '–'}
                          </span>
                          <span className="font-mono text-gray-600 dark:text-gray-400 truncate text-xs" title={r.user_id}>
                            {r.user_id.slice(0, 8)}…
                          </span>
                        </div>
                        <button type="button" onClick={() => copyUserId(r.user_id)} className="ml-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="User ID kopyala">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <RiskBadge score={r.risk_score} action={r.risk_action} />
                          {locked && (
                            <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200" title={`Kilitli: ${lockReason}`}>
                              Locked
                            </span>
                          )}
                        </div>
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
                        {(() => {
                          const flags = getRiskFlags(r);
                          return flags.length > 0 ? (
                            <>
                              {flags.slice(0, 3).map((f) => (
                                <span key={f} className="mr-1 inline-block rounded bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5">{f}</span>
                              ))}
                              {flags.length > 3 ? <span className="text-gray-400">+{flags.length - 3}</span> : null}
                            </>
                          ) : (
                            '–'
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {r.reviewed_at ? formatDateTR(r.reviewed_at) : '–'}
                        {r.reviewed_by && <span className="block text-xs text-gray-400">ID: {r.reviewed_by.slice(0, 8)}…</span>}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={r.note ?? ''}>
                        {r.note || '–'}
                      </td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        {r.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(r.id)}
                              disabled={actionLoadingId !== null || locked}
                              title={locked ? `Kilitli: ${lockReason}` : 'Onayla'}
                              className="mr-2 px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50 disabled:opacity-50"
                            >
                              {actionLoadingId === r.id ? '…' : 'Onayla'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectClick(r.id)}
                              disabled={actionLoadingId !== null || locked}
                              title={locked ? `Kilitli: ${lockReason}` : 'Reddet; puan iade edilir'}
                              className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50"
                            >
                              Reddet
                            </button>
                          </>
                        )}
                        {r.status === 'approved' && !locked && (
                          <button
                            type="button"
                            onClick={() => handleMarkProcessing(r)}
                            disabled={actionLoadingId !== null}
                            title="İşleniyor yap"
                            className="px-2 py-1 text-xs rounded bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/50 disabled:opacity-50"
                          >
                            {actionLoadingId === r.id ? '…' : 'Mark processing'}
                          </button>
                        )}
                        {r.status === 'processing' && !locked && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(r)}
                            disabled={actionLoadingId !== null}
                            title="Ödendi işaretle (external_ref zorunlu)"
                            className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 disabled:opacity-50"
                          >
                            {actionLoadingId === r.id ? '…' : 'Mark paid'}
                          </button>
                        )}
                        {!(r.status === 'pending' || (r.status === 'approved' && !locked) || (r.status === 'processing' && !locked)) && (
                          <span className="text-gray-400 text-xs">–</span>
                        )}
                      </td>
                    </tr>
                  ); })}
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
