'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  { name: 'Ahmet', amount: '45₺', time: 'az önce' },
  { name: 'Zeynep', amount: '120₺', time: '1 dk önce' },
  { name: 'Burak', amount: '80₺', time: '2 dk önce' },
  { name: 'Seda', amount: '200₺', time: '3 dk önce' },
  { name: 'Kerem', amount: '65₺', time: '4 dk önce' },
  { name: 'Merve', amount: '150₺', time: '5 dk önce' },
  { name: 'Deniz', amount: '95₺', time: '6 dk önce' },
];

export default function LandingSocialProof() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const m = MESSAGES[index];

  return (
    <div className="w-full overflow-hidden py-4 bg-gray-100 border-y border-gray-200">
      <div className="animate-marquee flex">
        {[...MESSAGES, ...MESSAGES].map((msg, i) => (
          <div
            key={i}
            className="flex items-center gap-2 shrink-0 mx-8 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm"
          >
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">
              {msg.name[0]}
            </span>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{msg.name}</span> {msg.time} ödül çekti{' '}
              <span className="font-semibold text-green-600">{msg.amount}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
