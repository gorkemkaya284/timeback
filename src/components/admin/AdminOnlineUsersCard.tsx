'use client';

import { useState, useEffect } from 'react';

const POLL_INTERVAL_MS = 10_000; // 10 seconds

type OnlineData = {
  ok: boolean;
  online_count: number;
  online_window_seconds?: number;
  list?: { user_id: string; last_seen: string }[];
};

export default function AdminOnlineUsersCard() {
  const [data, setData] = useState<OnlineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOnline = () => {
      fetch('/api/admin/presence/online?list=true', { credentials: 'include' })
        .then((res) => res.json())
        .then((json: OnlineData) => {
          setData(json);
        })
        .catch(() => setData({ ok: false, online_count: 0 }))
        .finally(() => setLoading(false));
    };

    fetchOnline();
    const id = setInterval(fetchOnline, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const count = data?.online_count ?? 0;
  const list = data?.list ?? [];

  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Anlık aktif kullanıcı</p>
      {loading ? (
        <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">—</p>
      ) : (
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{count}</p>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Son 60 saniyede heartbeat
      </p>
      {list.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Son 20 aktif</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {list.map((u) => (
              <div
                key={u.user_id}
                className="flex justify-between text-xs font-mono text-gray-600 dark:text-gray-300"
              >
                <span className="truncate max-w-[140px]" title={u.user_id}>
                  {u.user_id.slice(0, 8)}…
                </span>
                <span className="text-gray-400 dark:text-gray-500 shrink-0">
                  {new Date(u.last_seen).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
