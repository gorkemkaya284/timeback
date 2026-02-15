'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const controlLinks = [
  { name: 'Dashboard', href: '/app/admin/dashboard' },
  { name: 'Withdrawals', href: '/app/admin/redemptions' },
  { name: 'Users', href: '/app/admin/users' },
  { name: 'Security', href: '/app/admin/security' },
];
const otherLinks = [
  { name: 'Özet (eski)', href: '/app/admin/overview' },
  { name: 'Defter', href: '/app/admin/ledger' },
  { name: 'Ödüller', href: '/app/admin/rewards' },
  { name: 'Denetim kaydı', href: '/app/admin/audit' },
];

export default function AdminNav() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    cn(
      'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      pathname === href
        ? 'bg-accent text-accent-foreground ring-1 ring-accent/30'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
    );

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 pb-4 space-y-3">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Control Center</p>
      <div className="flex flex-wrap gap-2">
        {controlLinks.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.name}
          </Link>
        ))}
      </div>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-2">Diğer</p>
      <div className="flex flex-wrap gap-2">
        {otherLinks.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
