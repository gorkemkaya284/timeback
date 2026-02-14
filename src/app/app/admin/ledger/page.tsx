import { getReadClient, getAdminClient } from '@/lib/supabase/admin';
import AdminLedgerTable from '@/components/admin/AdminLedgerTable';

export default async function AdminLedgerPage({
  searchParams,
}: {
  searchParams: { user_id?: string };
}) {
  const readClient = getReadClient();
  const adminClient = getAdminClient();
  const userId = searchParams.user_id?.trim() || undefined;

  let entries: Array<{
    id: string;
    user_id: string;
    delta: number;
    reason: string;
    ref_type: string | null;
    ref_id: string | null;
    created_at: string;
    email?: string;
  }> = [];

  if (readClient) {
    let q = readClient
      .from('points_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (userId) q = q.eq('user_id', userId);
    const { data } = await q;
    entries = (data || []) as typeof entries;
    if (adminClient) {
      for (const e of entries) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(e.user_id);
        (e as { email?: string }).email = authUser?.user?.email ?? 'Unknown';
      }
    } else {
      entries.forEach((e) => ((e as { email?: string }).email = '—'));
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Defter</h2>
      <AdminLedgerTable initialEntries={entries} filterUserId={userId} />
    </div>
  );
}
