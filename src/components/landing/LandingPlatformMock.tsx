'use client';

import { useState, useEffect } from 'react';

const RANDOM_GAINS = [8, 12, 15, 20, 25, 30, 35];

const ACTIVITIES = [
  { name: 'Ayşe K.', action: 'Ödül çekti', amount: '+150₺', time: '1 dk önce' },
  { name: 'Mehmet T.', action: 'Anket tamamladı', amount: '+35 puan', time: '2 dk önce' },
  { name: 'Elif Y.', action: 'Ödül çekti', amount: '+80₺', time: '3 dk önce' },
  { name: 'Can D.', action: 'Görev tamamladı', amount: '+120 puan', time: '4 dk önce' },
  { name: 'Selin Ö.', action: 'Ödül çekti', amount: '+200₺', time: '5 dk önce' },
];

export default function LandingPlatformMock() {
  const [points, setPoints] = useState(8420);
  const [lastGain, setLastGain] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const gain = RANDOM_GAINS[Math.floor(Math.random() * RANDOM_GAINS.length)];
      setPoints((p) => p + gain);
      setLastGain(gain);
      setTimeout(() => setLastGain(null), 1200);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50 overflow-hidden">
        {/* Kazanç kartı */}
        <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Toplam bakiye
          </p>
          <p className="text-3xl font-bold text-gray-900 tabular-nums flex items-baseline gap-2">
            {points.toLocaleString('tr-TR')}
            <span className="text-lg font-medium text-gray-500">puan</span>
            {lastGain !== null && (
              <span className="text-sm font-semibold text-green-600 animate-pulse">
                +{lastGain}
              </span>
            )}
          </p>
          <div className="mt-2 flex gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Canlı
            </span>
          </div>
        </div>

        {/* Son aktiviteler */}
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Son aktiviteler
          </p>
          <ul className="space-y-2">
            {ACTIVITIES.map((a, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {a.name} {a.action}
                  </p>
                  <p className="text-xs text-gray-500">{a.time}</p>
                </div>
                <span className="text-sm font-semibold text-green-600 shrink-0 ml-2">
                  {a.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA mock */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="h-10 rounded-lg bg-green-600 flex items-center justify-center">
            <span className="text-sm font-semibold text-white">Görevleri gör</span>
          </div>
        </div>
      </div>
    </div>
  );
}
