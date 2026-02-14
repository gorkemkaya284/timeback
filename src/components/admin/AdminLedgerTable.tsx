'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPoints } from '@/lib/utils';

type Entry = {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
  email?: string;
};

export default function AdminLedgerTable({
  initialEntries,
  filterUserId,
}: {
  initialEntries: Entry[];
  filterUserId?: string;
}) {
  const router = useRouter();
  const entries = initialEntries;
  const [userId, setUserId] = useState(filterUserId || '');
  const [creditUserId, setCreditUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [debitUserId, setDebitUserId] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const applyFilter = () => {
    router.push(userId ? `/app/admin/ledger?user_id=${encodeURIComponent(userId)}` : '/app/admin/ledger');
  };

  const doCredit = async () => {
    const u = creditUserId.trim();
    const a = parseInt(creditAmount, 10);
    if (!u || isNaN(a) || a < 1) {
      setMessage('Geçerli kullanıcı ID ve miktar girin.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u, amount: a, type: 'credit' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Puan eklendi.');
        setCreditUserId('');
        setCreditAmount('');
        router.refresh();
      } else {
        setMessage(data.error || 'İşlem başarısız.');
      }
    } catch {
      setMessage('İstek başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const doDebit = async () => {
    const u = debitUserId.trim();
    const a = parseInt(debitAmount, 10);
    if (!u || isNaN(a) || a < 1) {
      setMessage('Geçerli kullanıcı ID ve miktar girin.');
      return;
    }
    if (!window.confirm(`Bu kullanıcıdan ${a} puan düşülecek. Geri alınamaz. Onaylıyor musunuz?`)) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u, amount: a, type: 'debit' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Puan düşüldü.');
        setDebitUserId('');
        setDebitAmount('');
        router.refresh();
      } else {
        setMessage(data.error || 'İşlem başarısız.');
      }
    } catch {
      setMessage('İstek başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Kullanıcı ID ile filtrele"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={applyFilter}
          className="rounded bg-accent text-accent-foreground px-3 py-1.5 text-sm font-medium"
        >
          Filtrele
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Puan ekle</h3>
          <input
            type="text"
            placeholder="user_id"
            value={creditUserId}
            onChange={(e) => setCreditUserId(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm mb-2"
          />
          <input
            type="number"
            placeholder="amount"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            min={1}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm mb-2"
          />
          <button type="button" onClick={doCredit} disabled={loading} className="rounded bg-green-600 text-white px-3 py-1.5 text-sm disabled:opacity-50">
            Ekle
          </button>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Pozitif defter girişi eklenir. Bakiye artar.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Puan düş</h3>
          <input
            type="text"
            placeholder="user_id"
            value={debitUserId}
            onChange={(e) => setDebitUserId(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm mb-2"
          />
          <input
            type="number"
            placeholder="amount"
            value={debitAmount}
            onChange={(e) => setDebitAmount(e.target.value)}
            min={1}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm mb-2"
          />
          <button type="button" onClick={doDebit} disabled={loading} className="rounded bg-red-600 text-white px-3 py-1.5 text-sm disabled:opacity-50">
            Düş
          </button>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Negatif defter girişi eklenir. Bakiye azalır. Onaylamadan önce kontrol edin.</p>
        </div>
      </div>
      {message && <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Puan</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Açıklama</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-300 truncate max-w-[140px]" title={e.user_id}>{e.email ?? e.user_id}</td>
                  <td className={`px-4 py-2 text-sm font-semibold ${e.delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {e.delta > 0 ? '+' : ''}{formatPoints(e.delta)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{e.reason}</td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{e.ref_type ?? '—'} {e.ref_id ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="font-medium">Defter kaydı yok</p>
            <p className="text-sm mt-1">Son 200 puan işlemi burada gösterilir. Bakiye düzenlemek için yukarıdaki Ekle/Düş kullanın.</p>
          </div>
        )}
      </div>
    </div>
  );
}
