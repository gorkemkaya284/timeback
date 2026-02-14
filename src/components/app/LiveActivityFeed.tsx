'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  'Ahmet · 2 dk önce · 45₺ çekti',
  'Merve · Görev tamamladı · +18 puan',
  'Can · Mobil uygulama yükledi',
  'Zeynep · 5 dk önce · 120₺ çekti',
  'Emre · Anket tamamladı · +12 puan',
  'Elif · Oyun görevi bitti · +25 puan',
  'Burak · 1 saat önce · 80₺ çekti',
  'Selin · Video izledi · +8 puan',
  'Kerem · Uygulama denedi · +30 puan',
  'Deniz · 15 dk önce · 200₺ çekti',
];

const ROTATE_MS = 4000;

export default function LiveActivityFeed() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 200);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Canlı aktivite
      </p>
      <div className="min-h-[1.5rem] flex items-center">
        <p
          className={`text-sm text-gray-700 dark:text-gray-300 transition-all duration-200 ${
            visible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-1'
          }`}
        >
          {MESSAGES[index]}
        </p>
      </div>
    </div>
  );
}
