'use client';

import { useState } from 'react';

export default function SystemCheckClient({
  userId,
  pointsTotal: initialPoints,
}: {
  userId: string;
  pointsTotal: number;
}) {
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<string | null>(null);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [loadingRedeem, setLoadingRedeem] = useState(false);

  const handleSeed = async () => {
    setLoadingSeed(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/system-check/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedResult(`PASS: +100 puan eklendi. Yeni toplam: ${data.newTotal ?? '?'}`);
      } else {
        setSeedResult(`FAIL: ${data.error ?? res.statusText}`);
      }
    } catch (e) {
      setSeedResult(`FAIL: ${e instanceof Error ? e.message : 'Network error'}`);
    } finally {
      setLoadingSeed(false);
    }
  };

  const handleRedeem = async () => {
    setLoadingRedeem(true);
    setRedeemResult(null);
    try {
      const res = await fetch('/api/system-check/redeem', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setRedeemResult(`PASS: ${data.message ?? 'Çekim yapıldı'}`);
      } else {
        setRedeemResult(`FAIL: ${data.error ?? data.message ?? res.statusText}`);
      }
    } catch (e) {
      setRedeemResult(`FAIL: ${e instanceof Error ? e.message : 'Network error'}`);
    } finally {
      setLoadingRedeem(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Test işlemleri
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSeed}
          disabled={loadingSeed}
          className="rounded-md bg-gray-900 dark:bg-white px-3 py-2 text-sm font-medium text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
        >
          {loadingSeed ? 'İşleniyor...' : 'Seed +100 puan'}
        </button>
        <button
          type="button"
          onClick={handleRedeem}
          disabled={loadingRedeem}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {loadingRedeem ? 'İşleniyor...' : 'En ucuz ödülü çek'}
        </button>
      </div>
      {seedResult && (
        <p className={`text-sm font-mono ${seedResult.startsWith('PASS') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {seedResult}
        </p>
      )}
      {redeemResult && (
        <p className={`text-sm font-mono ${redeemResult.startsWith('PASS') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {redeemResult}
        </p>
      )}
    </div>
  );
}
