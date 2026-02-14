import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account information</h2>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account created</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
            <dd className="mt-1">
              {profile?.is_banned ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                  Banned
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                  Active
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Risk score</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {profile?.risk_score ?? 0}/100
            </dd>
          </div>
        </dl>
      </div>

      <div className="card p-6 border-accent/20 bg-accent/5 dark:bg-accent/10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Security</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your account security matters. If you notice suspicious activity, contact support. All point transactions are logged and auditable.
        </p>
      </div>
    </div>
  );
}
