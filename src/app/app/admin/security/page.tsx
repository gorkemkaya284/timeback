'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type EventRow = { id: string; user_id: string | null; event_type: string; ip: string; user_agent: string; country: string | null; created_at: string; metadata: unknown };
type SuspiciousIp = { ip: string; distinct_users: number; event_count: number };

const REFRESH_THROTTLE_MS = 1000;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminSecurityPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [suspiciousIps, setSuspiciousIps] = useState<SuspiciousIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventType, setEventType] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const lastRefresh = useRef(0);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      const now = Date.now();
      if (now - lastRefresh.current < REFRESH_THROTTLE_MS) return;
      lastRefresh.current = now;
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (eventType) params.set('event_type', eventType);
      if (ipFilter) params.set('ip', ipFilter);
      if (userIdFilter) params.set('user_id', userIdFilter);

      const [eventsRes, ipsRes] = await Promise.all([
        fetch(`/api/admin/security/events?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/admin/security/suspicious-ips', { cache: 'no-store' }),
      ]);
      const eventsData = await eventsRes.json();
      const ipsData = await ipsRes.json();
      if (eventsData.ok) setEvents(eventsData.data ?? []);
      if (ipsData.ok) setSuspiciousIps(ipsData.data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventType, ipFilter, userIdFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h2>
        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-60"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-amber-50/50 dark:bg-amber-900/10 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Suspicious IPs (24h, ≥3 distinct users)</h3>
        {suspiciousIps.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-1 pr-4">IP</th>
                  <th className="pb-1 pr-4">Distinct users</th>
                  <th className="pb-1">Event count</th>
                </tr>
              </thead>
              <tbody>
                {suspiciousIps.map((row) => (
                  <tr key={row.ip}>
                    <td className="font-mono pr-4 text-gray-900 dark:text-white">{row.ip}</td>
                    <td className="pr-4 text-red-600 dark:text-red-400 font-medium">{row.distinct_users}</td>
                    <td>{row.event_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <h3 className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700">
          Son 200 Security Events
        </h3>
        <div className="p-3 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-700">
          <input
            type="text"
            placeholder="event_type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-40"
          />
          <input
            type="text"
            placeholder="IP"
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-36"
          />
          <input
            type="text"
            placeholder="user_id"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-48 font-mono"
          />
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
          >
            Filtrele
          </button>
        </div>
        {loading && events.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor…</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Event</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">IP</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">UA (trunc)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.event_type}</td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[140px]">{r.user_id ?? '–'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{r.ip ?? '–'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={r.user_agent}>{r.user_agent ? String(r.user_agent).slice(0, 60) + (r.user_agent.length > 60 ? '…' : '') : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {events.length === 0 && !loading && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Kayıt yok</div>
        )}
      </div>
    </div>
  );
}
