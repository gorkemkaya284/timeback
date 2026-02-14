'use client';

import { useRef, useState, useEffect } from 'react';
import { formatPoints } from '@/lib/utils';

const OFFERS = [
  { id: 1, title: 'Uygulama A\'yı indir ve 3 gün kullan', points: 120, time: '5 dk', provider: 'AdGate' },
  { id: 2, title: 'Anket: Alışveriş alışkanlıkları', points: 35, time: '3 dk', provider: 'Lootably' },
  { id: 3, title: 'Oyun B seviye 5\'i tamamla', points: 80, time: '15 dk', provider: 'AdGate' },
  { id: 4, title: 'Servis C\'ye kayıt ol', points: 150, time: '2 dk', provider: 'Monlix' },
  { id: 5, title: 'Uygulama D kurulum ve ilk giriş', points: 45, time: '4 dk', provider: 'AdGate' },
  { id: 6, title: 'Anket: Ürün geri bildirimi', points: 25, time: '2 dk', provider: 'Lootably' },
];

export default function FeaturedOffersCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    const ro = el ? new ResizeObserver(checkScroll) : null;
    if (el && ro) ro.observe(el);
    return () => ro?.disconnect();
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Öne çıkan görevler
        </h2>
        <div className="hidden sm:flex gap-1">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {OFFERS.map((o) => (
          <div
            key={o.id}
            className="flex-shrink-0 w-[260px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
            style={{ scrollSnapAlign: 'start' }}
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
              {o.title}
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                +{formatPoints(o.points)} puan
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{o.time}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{o.provider}</span>
            </div>
            <button
              type="button"
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
            >
              Başla
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
