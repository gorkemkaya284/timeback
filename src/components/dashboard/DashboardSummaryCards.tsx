import { formatPoints, formatTry, pointsToTry } from '@/lib/currency';

type Props = {
  balance: number;
  todayEarned: number;
  pendingEarnings: number;
  lastRedemptionStatus: 'pending' | 'fulfilled' | 'rejected' | null;
};

const STATUS_LABELS = {
  pending: 'Beklemede',
  fulfilled: 'Tamamlandı',
  rejected: 'Reddedildi',
};

const STATUS_STYLES = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
  fulfilled: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
};

export default function DashboardSummaryCards({
  balance,
  todayEarned,
  pendingEarnings,
  lastRedemptionStatus,
}: Props) {
  const tryStr = formatTry(pointsToTry(balance));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Toplam bakiye
        </p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {formatPoints(balance)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          puan (~{tryStr})
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Bugün kazanılan
        </p>
        <p className="text-xl font-bold text-green-600 dark:text-green-400">
          +{formatPoints(todayEarned)}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Bekleyen kazanç
        </p>
        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
          {formatPoints(pendingEarnings)}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Son çekim durumu
        </p>
        {lastRedemptionStatus ? (
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${STATUS_STYLES[lastRedemptionStatus]}`}
          >
            {STATUS_LABELS[lastRedemptionStatus]}
          </span>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">—</p>
        )}
      </div>
    </div>
  );
}
