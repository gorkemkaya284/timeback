'use client';

export default function OfferwallCard({ iframeSrc }: { iframeSrc: string | null }) {
  const isConfigured = !!iframeSrc;

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        Offerwall
      </h2>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {isConfigured && iframeSrc ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Görevleri tamamla, puan kazan. Tamamladığın görevler otomatik olarak bakiyene eklenir.
              </p>
            </div>
            <div className="relative w-full" style={{ minHeight: '500px' }}>
              <iframe
                src={iframeSrc}
                title="Offerwall"
                className="w-full border-0"
                style={{ height: '600px', minHeight: '500px' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center">
            <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 mb-4">
              Yakında aktif
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Offerwall entegrasyonu yakında aktif olacak.
            </p>
            <button
              type="button"
              disabled
              className="mt-4 w-full max-w-xs px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
            >
              Yakında
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
