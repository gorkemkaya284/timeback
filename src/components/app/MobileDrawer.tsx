'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { mainNav, bottomNav, LayoutIcon, type NavItemType } from '@/lib/app-nav';

const formatPoints = (points: number) =>
  new Intl.NumberFormat('tr-TR').format(points);

function DrawerNavItem({
  item,
  active,
  onClose,
}: {
  item: NavItemType;
  active: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.name}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg h-[46px] transition-colors duration-150 ease-out',
        active
          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-l-2 border-green-500 -ml-0.5 pl-3.5'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0', active && 'text-green-600 dark:text-green-400')} />
      <span className="text-sm font-medium truncate">{item.name}</span>
    </Link>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  balance: number;
  isAdmin: boolean;
};

export default function MobileDrawer({ open, onClose, balance, isAdmin }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        aria-hidden
        onClick={onClose}
      />
      {/* Drawer panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-[280px] max-w-[85vw]',
          'flex flex-col bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
          'md:hidden transition-transform duration-200 ease-out translate-x-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menü"
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="p-4 pb-3 flex flex-col gap-2 shrink-0">
            <Link
              href="/app/dashboard"
              onClick={onClose}
              className="flex items-center gap-2 min-w-0"
            >
              <img
                src="/brand/logo/logo-icon.svg"
                alt="Timeback"
                className="w-8 h-8 shrink-0"
              />
              <span className="text-base font-semibold text-gray-900 dark:text-white truncate">
                Timeback
              </span>
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Bakiye: <span className="font-medium text-gray-700 dark:text-gray-300">{formatPoints(balance)} P</span>
            </p>
          </div>

          <nav className="px-2 flex-1 pt-2">
            <ul className="space-y-0.5">
              {mainNav.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/app/dashboard' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <DrawerNavItem item={item} active={!!active} onClose={onClose} />
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="px-2 pt-2 pb-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
            <ul className="space-y-0.5">
              {bottomNav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <DrawerNavItem item={item} active={!!active} onClose={onClose} />
                  </li>
                );
              })}
              {isAdmin && (
                <li>
                  <Link
                    href="/app/admin"
                    onClick={onClose}
                    title="Admin"
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg h-[46px] transition-colors duration-150',
                      pathname.startsWith('/app/admin')
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-l-2 border-green-500 -ml-0.5 pl-3.5'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <LayoutIcon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium truncate">Admin</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
