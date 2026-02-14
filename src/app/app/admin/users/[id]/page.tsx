import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';
import { formatPoints } from '@/lib/utils';
import AdminUserIpLogs from '@/components/admin/AdminUserIpLogs';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userId } = await params;
  const adminClient = getAdminClient();

  if (!adminClient) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
        Servis anahtarı tanımlı değil. Kullanıcı detayı yüklenemiyor.
      </div>
    );
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('user_id, email, risk_score, is_banned, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  let totalPoints = 0;
  try {
    const { data } = await adminClient.rpc('get_user_points', { p_user_id: userId });
    totalPoints = typeof data === 'number' ? data : 0;
  } catch {
    // fallback
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin/users"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Kullanıcılar
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Kullanıcı</h3>
          <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{profile.user_id}</p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">{profile.email ?? '—'}</p>
          <p className="mt-2 text-sm">
            Risk: {profile.risk_score} •{' '}
            {profile.is_banned ? (
              <span className="text-red-600 dark:text-red-400">Banned</span>
            ) : (
              <span className="text-green-600 dark:text-green-400">Active</span>
            )}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Puan: {formatPoints(totalPoints)}
          </p>
        </div>
      </div>

      <AdminUserIpLogs userId={userId} />
    </div>
  );
}
