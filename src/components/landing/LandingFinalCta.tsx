'use client';

import Link from 'next/link';

export default function LandingFinalCta({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="py-16 sm:py-20">
      <div className="rounded-3xl bg-gradient-to-br from-green-600 to-emerald-700 px-6 py-12 sm:px-12 sm:py-16 text-center shadow-xl shadow-green-600/20">
        <h2 className="text-2xl font-bold text-white sm:text-3xl mb-4">
          Kazanmaya hazır mısın?
        </h2>
        <p className="text-green-100 max-w-md mx-auto mb-8 text-base sm:text-lg">
          Üyelik ücretsiz. Hemen görevleri tamamlamaya ve ilk kazancını almaya başla.
        </p>
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-green-600 bg-white rounded-xl hover:bg-green-50 transition-colors shadow-lg"
        >
          Ücretsiz başla
        </Link>
      </div>
    </section>
  );
}
