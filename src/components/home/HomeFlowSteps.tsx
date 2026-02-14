'use client';

const STEPS = [
  { title: 'Görev yap', desc: 'Görevleri tamamla' },
  { title: 'Puan kazan', desc: 'Bakiyene eklenir' },
  { title: 'Çekim yap', desc: 'Ödülü al' },
];

export default function HomeFlowSteps() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {STEPS.map((step, i) => (
        <div
          key={i}
          className="rounded-xl border p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-300"
          style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        >
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg font-bold text-sm text-white"
            style={{ backgroundColor: '#10b981' }}
          >
            {i + 1}
          </span>
          <h3 className="mt-3 text-base font-semibold" style={{ color: '#0f172a' }}>
            {step.title}
          </h3>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
            {step.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
