'use client';

import { useState, useMemo } from 'react';
import RewardCardFull from './RewardCardFull';
import RewardsToast from './RewardsToast';

export type RewardV2 = {
  id: string;
  title: string;
  provider: string;
  kind: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type RewardVariantV2 = {
  id: string;
  reward_id: string;
  denomination_tl: number;
  cost_points: number;
  stock: number | null;
  daily_limit_per_user: number | null;
  min_account_age_days: number | null;
  is_active: boolean;
  created_at: string;
};

type FilterTab = 'all' | 'gift' | 'bank_transfer';

export default function RewardsListV2({
  rewards,
  variants,
  userPoints,
  withdrawable,
  minPoints,
  redeemEnabled = true,
}: {
  rewards: RewardV2[];
  variants: RewardVariantV2[];
  userPoints: number;
  withdrawable: number;
  minPoints: number;
  redeemEnabled?: boolean;
}) {
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  const variantsByReward = useMemo(
    () =>
      variants.reduce<Record<string, RewardVariantV2[]>>((acc, v) => {
        const rid = v.reward_id;
        if (!acc[rid]) acc[rid] = [];
        acc[rid].push(v);
        return acc;
      }, {}),
    [variants]
  );

  const items = useMemo(() => {
    let list = rewards
      .map((r) => ({
        reward: r,
        variants: variantsByReward[r.id] ?? [],
      }))
      .filter((x) => x.variants.length > 0);

    if (filter === 'gift') list = list.filter((x) => x.reward.kind === 'gift');
    else if (filter === 'bank_transfer') list = list.filter((x) => x.reward.kind === 'bank_transfer');

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (x) =>
          x.reward.title.toLowerCase().includes(q) ||
          x.variants.some((v) => String(v.denomination_tl).includes(q))
      );
    }

    return list;
  }, [rewards, variantsByReward, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          1.000 P = 10 TL
        </span>
      </div>

      {!redeemEnabled && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          Ödüller yakında aktif olacak. Şimdilik bakiye biriktir.
        </div>
      )}

      {successToast && (
        <div
          role="alert"
          className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-200"
        >
          {successToast}
        </div>
      )}

      {errorToast && (
        <RewardsToast
          message={errorToast}
          type="error"
          onDismiss={() => setErrorToast(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Google, Steam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
        <div className="flex gap-1">
          {(['all', 'gift', 'bank_transfer'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab === 'all' ? 'Tümü' : tab === 'gift' ? 'Dijital' : 'Havale'}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {search || filter !== 'all' ? 'Bu kriterlere uygun ödül bulunamadı.' : 'Henüz çekim seçeneği yok. Bakiye biriktir, yakında açılır.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ reward, variants: vs }) => (
            <RewardCardFull
              key={reward.id}
              reward={reward}
              variants={vs}
              withdrawable={withdrawable}
              minPoints={minPoints}
              redeemEnabled={redeemEnabled}
              onSuccess={() => setSuccessToast('Talebin alındı (beklemede)')}
              onError={(msg) => setErrorToast(msg)}
              onInsufficientBalance={(msg) => setErrorToast(msg)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
