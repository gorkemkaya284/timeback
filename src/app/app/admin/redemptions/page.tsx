import AdminRedemptionsTable from '@/components/admin/AdminRedemptionsTable';

export default function AdminRedemptionsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Çekimler</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Onayla: talebi tamamlandı işaretle. Reddet: talebi kapat; puanlar otomatik iade edilmez.</p>
      <AdminRedemptionsTable />
    </div>
  );
}
