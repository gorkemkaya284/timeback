import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, DEV_MODE } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { getAdminClient } from '@/lib/supabase/admin';
import { ensureDevProfile } from '@/lib/supabase/profile';
import AdminNav from '@/components/admin/AdminNav';

function AdminShell({
  children,
  hasServiceRole,
}: {
  children: React.ReactNode;
  hasServiceRole: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yönetim</h1>
        <Link href="/app/dashboard" className="btn-ghost text-sm">
          ← Panel
        </Link>
      </div>
      {!hasServiceRole && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200" role="alert">
          Servis anahtarı tanımlı değil. Okuma işlemleri çalışır; yazma işlemleri devre dışı.
        </div>
      )}
      <AdminNav />
      {children}
    </div>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (DEV_MODE) {
    await ensureDevProfile();
    return <AdminShell hasServiceRole={!!getAdminClient()}>{children}</AdminShell>;
  }

  const user = await getCurrentUser();
  if (!user) redirect('/app/dashboard');
  const allowed = await allowAdminAccess(user);
  if (!allowed) redirect('/app/dashboard');

  return <AdminShell hasServiceRole={!!getAdminClient()}>{children}</AdminShell>;
}
