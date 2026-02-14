import { formatPoints, formatTry, pointsToTry } from '@/lib/currency';

type Props = {
  balance: number;
  todayEarned: number;
  pending: number;
};

export default function EarningOverviewBar({ balance, todayEarned, pending }: Props) {
  const tryStr = formatTry(pointsToTry(balance));

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6 py-4 px-4 sm:px-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Bakiye
        </span>
        <span className="text-base font-semibold text-gray-900 dark:text-white">
          {formatPoints(balance)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">puan</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">(~{tryStr})</span>
      </div>
      <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Bugün kazanılan
        </span>
        <span className="text-base font-semibold text-green-600 dark:text-green-400">
          +{formatPoints(todayEarned)}
        </span>
      </div>
      <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Bekleyen
        </span>
        <span className="text-base font-semibold text-amber-600 dark:text-amber-400">
          {formatPoints(pending)} puan
        </span>
      </div>
    </div>
  );
}
