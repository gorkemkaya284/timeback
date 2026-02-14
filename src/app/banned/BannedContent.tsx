'use client';

/**
 * Client component for banned page — provides Logout button with fetch+redirect.
 */
export default function BannedContent() {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Hesabınız erişime kapatıldı. Destek ile iletişime geçin.
        </h1>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Çıkış yap
          </button>
          <a
            href="mailto:support@timeback.com"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:underline"
          >
            Destek ile iletişim
          </a>
        </div>
      </div>
    </div>
  );
}
