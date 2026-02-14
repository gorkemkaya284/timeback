import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { allowAdminAccess } from '@/lib/utils-server';
import { ensureProfile } from '@/lib/supabase/profile';
import { getPointsSummary } from '@/lib/points-ledger';
import Sidebar from '@/components/app/Sidebar';
import TopBar from '@/components/app/TopBar';
import MobileNav from '@/components/app/MobileNav';
import AppFooter from '@/components/app/AppFooter';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/app/dashboard');
  }

  const supabaseDb = await createClient();
  try {
    await ensureProfile(user.id, user.email ?? undefined, supabaseDb);
  } catch {
    // non-blocking
  }

  const { data: profile } = await supabaseDb
    .from('profiles')
    .select('is_banned')
    .eq('user_id', user.id)
    .single();

  if (profile?.is_banned) {
    redirect('/banned');
  }

  const [isAdmin, { totalPoints }] = await Promise.all([
    allowAdminAccess({ id: user.id, email: user.email ?? '' }),
    getPointsSummary(user.id),
  ]);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      <aside className="flex flex-shrink-0">
        <Sidebar isAdmin={!!isAdmin} balance={totalPoints} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar email={user.email || ''} isAdmin={!!isAdmin} />
        <MobileNav />
        <main className="flex-1 overflow-y-auto focus:outline-none flex flex-col">
          <div className="container-app py-6 flex-1">
            {children}
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
