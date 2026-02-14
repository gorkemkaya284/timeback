'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  'Mehmet · 3 dk önce · 50₺ çekti',
  'Elif · Görev tamamladı · +20 puan',
  'Ahmet · 5 dk önce · 120₺ çekti',
  'Selin · Anket tamamladı · +15 puan',
  'Can · 12 dk önce · 75₺ çekti',
  'Zeynep · Uygulama denedi · +25 puan',
];

const ROTATE_MS = 3600;

export default function HomeLiveActivity() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 280);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-md"
      style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
        Canlı aktivite
      </p>
      <div className="min-h-[2.5rem] overflow-hidden">
        <p
          className="text-sm font-medium transition-all duration-400 ease-out"
          style={{
            color: '#0f172a',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-10px)',
          }}
        >
          {MESSAGES[index]}
        </p>
      </div>
    </div>
  );
}
