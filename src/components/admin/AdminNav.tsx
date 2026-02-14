'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const overviewLink = { name: 'Özet', href: '/app/admin/overview' };
const manageLinks = [
  { name: 'Kullanıcılar', href: '/app/admin/users' },
  { name: 'Defter', href: '/app/admin/ledger' },
  { name: 'Ödüller', href: '/app/admin/rewards' },
  { name: 'Çekimler', href: '/app/admin/redemptions' },
];
const auditLink = { name: 'Denetim kaydı', href: '/app/admin/audit' };

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
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Özet</p>
      <div className="flex flex-wrap gap-2">
        <Link href={overviewLink.href} className={linkClass(overviewLink.href)}>
          {overviewLink.name}
        </Link>
      </div>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-2">Yönetim</p>
      <div className="flex flex-wrap gap-2">
        {manageLinks.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.name}
          </Link>
        ))}
      </div>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-2">Kayıtlar</p>
      <div className="flex flex-wrap gap-2">
        <Link href={auditLink.href} className={linkClass(auditLink.href)}>
          {auditLink.name}
        </Link>
      </div>
    </nav>
  );
}
