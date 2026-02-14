'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileDrawer from './MobileDrawer';
import AppFooter from './AppFooter';

type Props = {
  email: string;
  isAdmin: boolean;
  balance: number;
  children: React.ReactNode;
};

export default function AppShell({ email, isAdmin, balance, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      <aside className="flex flex-shrink-0">
        <Sidebar isAdmin={isAdmin} balance={balance} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          email={email}
          isAdmin={isAdmin}
          balance={balance}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto focus:outline-none flex flex-col">
          <div className="container-app py-6 flex-1">
            {children}
          </div>
          <AppFooter />
        </main>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        balance={balance}
        isAdmin={isAdmin}
      />
    </div>
  );
}
