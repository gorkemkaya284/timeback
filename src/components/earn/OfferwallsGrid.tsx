'use client';

const PROVIDERS = [
  {
    id: 'adgate',
    name: 'AdGate Media',
    description: 'Yüksek ödemeli görevler, anketler ve uygulama kurulumları. Anında puan.',
    status: 'hot' as const,
    prominent: true,
  },
  {
    id: 'lootably',
    name: 'Lootably',
    description: 'Anketler, görevler ve mini işler. Hızlı ödeme.',
    status: 'recommended' as const,
    prominent: false,
  },
  {
    id: 'monlix',
    name: 'Monlix',
    description: 'Özel görevler ve anketler. 24 saat içinde puan yansıması.',
    status: 'new' as const,
    prominent: false,
  },
];

const STATUS_LABELS = { new: 'Yeni', hot: 'Popüler', recommended: 'Önerilen' };
const STATUS_STYLES = {
  new: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200',
  hot: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
  recommended: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
};

export default function OfferwallsGrid({ iframeSrc }: { iframeSrc: string | null }) {
  const adgate = PROVIDERS.find((p) => p.id === 'adgate')!;
  const others = PROVIDERS.filter((p) => p.id !== 'adgate');

  return (
    <section>
      <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3">
        Tüm görev sağlayıcılar
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-3">
        {/* AdGate prominent */}
        <div className="lg:col-span-2 rounded-xl border-2 border-green-200 dark:border-green-800/50 bg-white dark:bg-gray-800 overflow-hidden shadow-sm ring-1 ring-green-100 dark:ring-green-900/30">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {adgate.name}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_STYLES[adgate.status]}`}
              >
                {STATUS_LABELS[adgate.status]}
              </span>
            </div>
          </div>
          <p className="p-3 text-xs text-gray-600 dark:text-gray-400">
            {adgate.description}
          </p>
          {iframeSrc ? (
            <div className="relative w-full" style={{ minHeight: '400px' }}>
              <iframe
                src={iframeSrc}
                title="AdGate görevleri"
                className="w-full border-0"
                style={{ height: '420px', minHeight: '400px' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          ) : (
            <div className="p-8 text-center">
              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 mb-2">
                Yakında
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                AdGate görevleri kısa süre içinde aktif olacak.
              </p>
              <button
                type="button"
                disabled
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
              >
                Görevleri gör
              </button>
            </div>
          )}
        </div>
        {/* Other providers */}
        <div className="flex flex-col gap-2">
          {others.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {p.name}
                </span>
                <span
                  className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded ${STATUS_STYLES[p.status]}`}
                >
                  {STATUS_LABELS[p.status]}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {p.description}
              </p>
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
              >
                Yakında
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
