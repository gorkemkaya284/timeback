import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { allowAdminAccess } from '@/lib/utils-server';
import { ensureProfile } from '@/lib/supabase/profile';
import { getPointsSummary } from '@/lib/points-ledger';
import AppShell from '@/components/app/AppShell';

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
    <AppShell
      email={user.email || ''}
      isAdmin={!!isAdmin}
      balance={totalPoints}
    >
      {children}
    </AppShell>
  );
}
