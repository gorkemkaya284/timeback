'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const formatPoints = (points: number) =>
  new Intl.NumberFormat('tr-TR').format(points);

const mainNav = [
  { name: 'Genel Bakış', href: '/app/dashboard', icon: LayoutIcon },
  { name: 'Kazanç', href: '/app/earn', icon: TrendingIcon },
  { name: 'Ödül Çek', href: '/app/rewards', icon: GiftIcon },
  { name: 'Geçmiş', href: '/app/history', icon: HistoryIcon },
];

const bottomNav = [
  { name: 'Destek', href: '/app/support', icon: HelpIcon },
  { name: 'Güvenlik', href: '/app/profile', icon: ShieldIcon },
];

function LayoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}
function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function HelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

type NavItemType = { name: string; href: string; icon: (p: { className?: string }) => JSX.Element };
function NavItem({ item, active }: { item: NavItemType; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.name}
      className={cn(
        'flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 rounded-lg h-[46px] transition-colors duration-150 ease-out',
        active
          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-l-2 border-green-500 -ml-0.5 lg:pl-3.5 pl-2.5'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0', active && 'text-green-600 dark:text-green-400')} />
      <span className="text-sm font-medium truncate hidden lg:inline">{item.name}</span>
    </Link>
  );
}

export default function Sidebar({
  isAdmin,
  balance = 0,
}: {
  isAdmin?: boolean;
  balance?: number;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0',
        'w-[72px] md:w-[72px] lg:w-[250px]',
        'transition-[width] duration-200 ease-out'
      )}
    >
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Üst: Logo + Bakiye */}
        <div className="p-4 pb-3 flex flex-col gap-2 shrink-0">
          <Link
            href="/app/dashboard"
            className="flex items-center justify-center lg:justify-start gap-2 min-w-0"
          >
            <img
              src="/brand/logo/logo-icon.svg"
              alt="Timeback"
              className="w-8 h-8 shrink-0"
            />
            <span className="text-base font-semibold text-gray-900 dark:text-white truncate hidden lg:inline">
              Timeback
            </span>
          </Link>
          <div className="hidden lg:block">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Bakiye: <span className="font-medium text-gray-700 dark:text-gray-300">{formatPoints(balance)} P</span>
            </p>
          </div>
        </div>

        {/* Ana menü */}
        <nav className="px-2 flex-1 pt-2">
          <ul className="space-y-0.5">
            {mainNav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/app/dashboard' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <NavItem item={item} active={!!active} />
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Alt menü */}
        <div className="px-2 pt-2 pb-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <ul className="space-y-0.5">
            {bottomNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <NavItem item={item} active={!!active} />
                </li>
              );
            })}
            {isAdmin && (
              <li>
                <Link
                  href="/app/admin"
                  title="Admin"
                  className={cn(
                    'flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 rounded-lg h-[46px] transition-colors duration-150',
                    pathname.startsWith('/app/admin')
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-l-2 border-green-500 -ml-0.5 lg:pl-3.5 pl-2.5'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <LayoutIcon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium truncate hidden lg:inline">Admin</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}
