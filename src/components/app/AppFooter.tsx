import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 py-6">
      <div className="container-app flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <p>Bakiye · Kazan · Çekim</p>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Şartlar
          </Link>
          <Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Gizlilik
          </Link>
          <Link href="/app/support" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Destek
          </Link>
        </div>
      </div>
    </footer>
  );
}
