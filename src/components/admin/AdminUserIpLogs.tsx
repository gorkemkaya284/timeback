'use client';

import { useEffect, useState } from 'react';

type IpLog = {
  ip: string;
  event: string;
  path: string | null;
  user_agent: string | null;
  created_at: string;
};

export default function AdminUserIpLogs({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<IpLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${encodeURIComponent(userId)}/ip-logs`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setLogs(data.logs ?? []);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">IP Logs</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">IP Logs</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No IP logs yet</p>
      ) : (
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">IP</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Event</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">{log.ip}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">{log.event}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={log.path ?? ''}>
                    {log.path ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
