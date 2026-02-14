'use client';

import Link from 'next/link';

const TRUST_CHIPS = [
  { label: 'Anında yansıma', dot: 'green' },
  { label: 'Güvenli sistem', dot: 'sky' },
  { label: 'Canlı destek', dot: 'emerald' },
];

export default function LandingHero({ ctaHref }: { ctaHref: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-[3rem] leading-[1.1]">
        Görevleri tamamla, anında kazan
      </h1>
      <p className="max-w-lg text-lg text-gray-600 leading-relaxed">
        Basit görevlerle puan topla, kazancını saniyeler içinde ödüle çevir.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/25"
        >
          Hemen başla
        </Link>
        <a
          href="#nasil-calisir"
          className="inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Nasıl çalışır?
        </a>
      </div>
      <div className="flex flex-wrap gap-6 pt-2">
        {TRUST_CHIPS.map((chip) => (
          <span
            key={chip.label}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                chip.dot === 'green'
                  ? 'bg-green-500'
                  : chip.dot === 'sky'
                  ? 'bg-sky-500'
                  : 'bg-emerald-500'
              }`}
            />
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  );
}
