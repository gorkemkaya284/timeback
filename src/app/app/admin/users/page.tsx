import AdminUsersTable from '@/components/admin/AdminUsersTable';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Kullanıcılar</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Yasaklama: kullanıcı çekim yapamaz veya uygulamayı kullanamaz. Risk skoru: dolandırıcılık sinyalleri için (0–100).</p>
      <AdminUsersTable />
    </div>
  );
}
