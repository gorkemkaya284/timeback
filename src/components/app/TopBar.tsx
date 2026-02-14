'use client';

import Link from 'next/link';
import UserMenu from './UserMenu';
import BrandLogo from '@/components/brand/BrandLogo';

const formatPoints = (points: number) =>
  new Intl.NumberFormat('tr-TR').format(points);

export default function TopBar({
  email,
  isAdmin,
  balance,
  onMenuClick,
}: {
  email: string;
  isAdmin: boolean;
  balance?: number;
  onMenuClick?: () => void;
}) {
  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-between gap-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            aria-label="Menüyü aç"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <BrandLogo />
        {balance !== undefined && (
          <span className="md:hidden text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {formatPoints(balance)} P
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/app/settings/appearance"
          className="btn-ghost text-sm py-2 hidden sm:inline-flex"
        >
          Ayarlar
        </Link>
        {isAdmin && (
          <Link
            href="/app/admin"
            className="btn-ghost text-sm py-2 hidden sm:inline-flex"
          >
            Admin
          </Link>
        )}
        <UserMenu email={email} />
      </div>
    </header>
  );
}
