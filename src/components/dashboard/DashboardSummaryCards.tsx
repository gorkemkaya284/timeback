import { formatPoints, formatTry, pointsToTry } from '@/lib/currency';
import { REDEMPTION_STATUS, getRedemptionStatusStyle } from '@/lib/status';

type Props = {
  balance: number;
  todayEarned: number;
  pendingEarnings: number;
  lastRedemptionStatus: 'pending' | 'fulfilled' | 'rejected' | null;
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
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${getRedemptionStatusStyle(REDEMPTION_STATUS[lastRedemptionStatus].label)}`}
          >
            {REDEMPTION_STATUS[lastRedemptionStatus].label}
          </span>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">—</p>
        )}
      </div>
    </div>
  );
}
