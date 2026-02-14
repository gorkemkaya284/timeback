'use client';

const TRUST_ITEMS = [
  'Anında yansıma',
  'Güvenli sistem',
  'Canlı destek',
];

export default function AuthBrandingSide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl leading-tight">
          Kazanmaya hemen başla
        </h1>
        <p className="mt-4 text-base text-gray-600 leading-relaxed max-w-sm">
          Görevleri tamamla, puan kazan ve kazancını kolayca ödüle çevir.
        </p>
      </div>

      <ul className="space-y-3">
        {TRUST_ITEMS.map((label) => (
          <li key={label} className="flex items-center gap-3 text-gray-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
            {label}
          </li>
        ))}
      </ul>

      <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
        <p className="text-sm font-medium text-green-800">
          Bugün 1.248 kişi kazanmaya başladı
        </p>
      </div>
    </div>
  );
}
