'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

type KPIs = { pending: number; approved_24h: number; rejected_24h: number; blocks_24h: number };
type ActivityRow = { id: string; user_id: string | null; event_type: string; ip: string; created_at: string; metadata: unknown };
type RiskUser = { user_id: string; risk_max_24h: number; blocks_24h: number; last_ip: string | null };
type HighRiskRow = { id: string; user_id: string; status: string; payout_tl: number; cost_points: number; created_at: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [latestActivity, setLatestActivity] = useState<ActivityRow[]>([]);
  const [topRiskUsers, setTopRiskUsers] = useState<RiskUser[]>([]);
  const [highRiskQueue, setHighRiskQueue] = useState<HighRiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastRefresh = useRef(0);
  const REFRESH_THROTTLE_MS = 1000;

  const fetchDashboard = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      const now = Date.now();
      if (now - lastRefresh.current < REFRESH_THROTTLE_MS) return;
      lastRefresh.current = now;
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setKpis(data.kpis ?? null);
        setLatestActivity(data.latest_activity ?? []);
        setTopRiskUsers(data.top_risk_users_24h ?? []);
        setHighRiskQueue(data.high_risk_queue ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h2>
        <button
          type="button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-60"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading && !kpis ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{kpis?.pending ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approved (24h)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis?.approved_24h ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rejected (24h)</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{kpis?.rejected_24h ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Blocks (24h)</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{kpis?.blocks_24h ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Risk (24h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{topRiskUsers.length}</p>
            </div>
          </div>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
            <h3 className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700">
              Latest Activity (redeem_attempt / success / blocked)
            </h3>
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Event</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {latestActivity.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.event_type === 'redeem_blocked' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                          r.event_type === 'redeem_success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {r.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[140px]">{r.user_id ?? '–'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{r.ip ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {latestActivity.length === 0 && (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Henüz aktivite yok</div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
            <h3 className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700">
              High Risk Queue (risk_max_24h ≥ 70)
            </h3>
            <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Payout / Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {highRiskQueue.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[160px]">
                        <Link href={`/app/admin/redemptions?q=${encodeURIComponent(r.user_id)}`} className="hover:underline">
                          {r.user_id}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' : r.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{r.payout_tl} TL / {r.cost_points} P</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {highRiskQueue.length === 0 && (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Yüksek risk kuyruğu boş</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
