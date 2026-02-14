'use client';

import Link from 'next/link';
import UserMenu from './UserMenu';
import BrandLogo from '@/components/brand/BrandLogo';

export default function TopBar({
  email,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
}) {
  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-between gap-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6">
      <BrandLogo />
      <div className="flex items-center gap-2">
        <Link
          href="/app/settings/appearance"
          className="btn-ghost text-sm py-2"
        >
          Ayarlar
        </Link>
        {isAdmin && (
          <Link
            href="/app/admin"
            className="btn-ghost text-sm py-2"
          >
            Admin
          </Link>
        )}
        <UserMenu email={email} />
      </div>
    </header>
  );
}
