import { getCurrentUser } from '@/lib/dev';
import { createClient } from '@/lib/supabase/server';
import { getPointsSummary } from '@/lib/points-ledger';
import SystemCheckClient from '@/components/app/SystemCheckClient';

export default async function SystemCheckPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  let profileExists: boolean | null = null;
  let isBanned: boolean | null = null;
  let pointsTotal = 0;
  let errorMsg: string | null = null;

  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('user_id', user.id)
        .maybeSingle();
      profileExists = profile != null;
      isBanned = profile?.is_banned ?? false;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Profile check failed';
    }

    try {
      const summary = await getPointsSummary(user.id);
      pointsTotal = summary.totalPoints;
    } catch (e) {
      if (!errorMsg) errorMsg = e instanceof Error ? e.message : 'Points fetch failed';
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sistem kontrolü</h1>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 text-sm">
        <Row
          label="Auth"
          value={user ? 'Giriş yapıldı' : 'Giriş yapılmadı'}
          pass={!!user}
        />
        <Row
          label="user_id"
          value={user?.id ?? '—'}
          pass={!!user?.id}
        />
        <Row
          label="Profil var mı"
          value={profileExists === null ? '?' : profileExists ? 'Evet' : 'Hayır'}
          pass={profileExists === true}
        />
        <Row
          label="is_banned"
          value={isBanned === null ? '?' : isBanned ? 'Evet' : 'Hayır'}
          pass={isBanned === false}
        />
        <Row
          label="Puan toplam (ledger SUM)"
          value={String(pointsTotal)}
          pass={true}
        />
        {errorMsg && (
          <p className="text-red-600 dark:text-red-400 mt-2">{errorMsg}</p>
        )}
      </div>

      {user && (
        <SystemCheckClient userId={user.id} pointsTotal={pointsTotal} />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  pass,
}: {
  label: string;
  value: string;
  pass: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-mono text-gray-900 dark:text-white truncate max-w-[200px]" title={value}>
        {value}
      </span>
      <span
        className={`shrink-0 text-xs font-semibold ${pass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
      >
        {pass ? 'PASS' : 'FAIL'}
      </span>
    </div>
  );
}
