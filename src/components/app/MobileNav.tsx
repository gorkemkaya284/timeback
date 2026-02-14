'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const nav = [
  { name: 'Panel', href: '/app/dashboard' },
  { name: 'Kazan', href: '/app/earn' },
  { name: 'Çekim', href: '/app/rewards' },
  { name: 'Geçmiş', href: '/app/history' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex gap-1 px-2 py-2 overflow-x-auto">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href === '/app/rewards' && pathname.startsWith('/app/rewards'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'shrink-0 px-3 py-2 rounded-md text-sm font-medium',
                active
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
