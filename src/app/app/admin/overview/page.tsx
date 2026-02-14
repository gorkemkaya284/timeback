import { getAdminOverview } from '@/lib/admin-data';
import { formatPoints } from '@/lib/utils';
import AdminOnlineUsersCard from '@/components/admin/AdminOnlineUsersCard';

export default async function AdminOverviewPage() {
  const data = await getAdminOverview();

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Özet</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <AdminOnlineUsersCard />
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Toplam kullanıcı</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalUsers}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Dağıtılan puan</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPoints(data.totalPointsIssued)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Harcanan puan</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatPoints(data.totalPointsSpent)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Bekleyen çekim</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.pendingRedemptions}</p>
        </div>
      </div>

      <section>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Son denetim kayıtları</h3>
        <div className="card overflow-hidden">
          {data.recentAudit.length > 0 ? (
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">İşlem</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Hedef</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.recentAudit.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.actor}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.action}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {r.target_type} {r.target_id ? `#${r.target_id}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="font-medium">Henüz denetim kaydı yok</p>
              <p className="text-sm mt-1">Yasaklama, defter ve çekim işlemleri burada görünür.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
