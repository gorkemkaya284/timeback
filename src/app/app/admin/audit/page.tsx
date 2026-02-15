import { getReadClient } from '@/lib/supabase/admin';

export default async function AdminAuditPage() {
  const client = getReadClient();
  let entries: Array<{
    id: string;
    actor: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    payload: unknown;
    created_at: string;
  }> = [];

  if (client) {
    const { data } = await client
      .from('tb_admin_audit_log')
      .select('id, admin_user_id, action, entity_type, entity_id, after_state, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    entries = (data || []).map((r: { id: string; admin_user_id: string; action: string; entity_type: string | null; entity_id: string | null; after_state: unknown; created_at: string }) => ({
      id: r.id,
      actor: r.admin_user_id,
      action: r.action,
      target_type: r.entity_type,
      target_id: r.entity_id,
      payload: r.after_state,
      created_at: r.created_at,
    }));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Denetim kaydı</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">İşlem</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Hedef</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.actor}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.action}</td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {r.target_type} {r.target_id ? `#${r.target_id}` : ''}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {r.payload != null ? JSON.stringify(r.payload) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="font-medium">Henüz denetim kaydı yok</p>
            <p className="text-sm mt-1">Servis anahtarı tanımlı olduğunda yasaklama, defter ve çekim işlemleri burada görünür.</p>
          </div>
        )}
      </div>
    </div>
  );
}
