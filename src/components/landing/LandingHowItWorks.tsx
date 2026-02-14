'use client';

const STEPS = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Görevleri tamamla',
    desc: 'Anket, izleme veya basit görevlerden birini seçip tamamla.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Puan topla',
    desc: 'Her tamamlanan görev için anında puan kazanırsın.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Ödülü çek',
    desc: 'Puanlarını anında nakite veya hediye kartına çevir.',
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="nasil-calisir" className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl mb-10 text-center">
        Nasıl çalışır?
      </h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-200 shadow-sm"
          >
            {i < STEPS.length - 1 && (
              <div className="hidden sm:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-200 -translate-y-1/2" />
            )}
            <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-green-600 mb-4">
              {step.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed max-w-xs">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
