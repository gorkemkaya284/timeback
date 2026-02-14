'use client';

import { useEffect, useState } from 'react';
import { formatPoints } from '@/lib/utils';

interface AdminUser {
  user_id: string;
  email: string;
  risk_score: number;
  is_banned: boolean;
  created_at: string;
  total_points?: number;
  last_activity?: string | null;
}

export default function AdminUsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const fetchUsers = async () => {
    setError(null);
    setWarning(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers(data.users || []);
        if (data.warning) setWarning(data.warning);
      } else {
        const parts = [`HTTP ${res.status}`];
        if (data.error) parts.push(data.error);
        if (data.message) parts.push(data.message);
        if (data.details) parts.push(`(${data.details})`);
        setError(parts.length > 1 ? parts.join(': ') : res.statusText);
      }
    } catch (e) {
      setError(String(e));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleBan = async (userId: string, current: boolean) => {
    const action = current ? 'Unban' : 'Ban';
    const msg = current
      ? 'Allow this user to use the app and redeem again?'
      : 'Ban this user? They will not be able to redeem or use the app.';
    if (!window.confirm(`${action} user?\n\n${msg}`)) return;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isBanned: !current }),
    });
    if (res.ok) fetchUsers();
  };

  const setRisk = async (userId: string, delta: number) => {
    const u = users.find((x) => x.user_id === userId);
    if (!u) return;
    const next = Math.max(0, Math.min(100, u.risk_score + delta));
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, riskScore: next }),
    });
    if (res.ok) fetchUsers();
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
        <p className="font-medium text-red-800 dark:text-red-300">Yükleme hatası</p>
        <p className="mt-1 text-sm text-red-700 dark:text-red-400 font-mono break-words">{error}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); setError(null); fetchUsers(); }}
          className="mt-3 px-3 py-1 text-sm bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-900/60"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {warning && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">{warning}</p>
        </div>
      )}
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Risk</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Points</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Last activity</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((u) => (
              <tr key={u.user_id}>
                <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{u.user_id}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{u.email}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                  <span className="mr-1">{u.risk_score}</span>
                  <button type="button" onClick={() => setRisk(u.user_id, -10)} className="text-gray-400 hover:text-accent">−</button>
                  <button type="button" onClick={() => setRisk(u.user_id, 10)} className="text-gray-400 hover:text-accent ml-1">+</button>
                </td>
                <td className="px-4 py-2">
                  {u.is_banned ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">Banned</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">Active</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{formatPoints(u.total_points ?? 0)}</td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {u.last_activity ? new Date(u.last_activity).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => toggleBan(u.user_id, u.is_banned)}
                    title={u.is_banned ? 'Allow user to use app again' : 'Block user from redeeming and using app'}
                    className={`px-2 py-1 text-xs rounded ${u.is_banned ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}
                  >
                    {u.is_banned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p className="font-medium">Kayıtlı kullanıcı yok</p>
          <p className="text-sm mt-1">Tüm profiller burada listelenir. Yasaklama ve risk skoru ayarlarını buradan yapabilirsiniz.</p>
        </div>
      )}
    </div>
  );
}
