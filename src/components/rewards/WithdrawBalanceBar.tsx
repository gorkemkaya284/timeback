import { formatPoints } from '@/lib/utils';

const POINTS_TO_TRY = 100; // 100 puan ≈ 1₺

type Props = {
  balance: number;
  withdrawable: number;
  pending: number;
};

export default function WithdrawBalanceBar({ balance, withdrawable, pending }: Props) {
  const tryApprox = (balance / POINTS_TO_TRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  const pendingTry = (pending / POINTS_TO_TRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-4 px-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Mevcut bakiye
        </span>
        <span className="text-base font-semibold text-gray-900 dark:text-white">
          {formatPoints(balance)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">puan</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">(~{tryApprox} ₺)</span>
      </div>
      <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Çekilebilir
        </span>
        <span className="text-base font-semibold text-green-600 dark:text-green-400">
          {formatPoints(withdrawable)}
        </span>
      </div>
      <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Bekleyen
        </span>
        <span className="text-base font-semibold text-amber-600 dark:text-amber-400">
          {formatPoints(pending)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">(~{pendingTry} ₺)</span>
      </div>
    </div>
  );
}
