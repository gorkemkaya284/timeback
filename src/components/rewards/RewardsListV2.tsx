'use client';

import { useState } from 'react';
import RewardCardV2 from './RewardCardV2';

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

  const variantsByReward = variants.reduce<Record<string, RewardVariantV2[]>>((acc, v) => {
    const rid = v.reward_id;
    if (!acc[rid]) acc[rid] = [];
    acc[rid].push(v);
    return acc;
  }, {});

  const items = rewards
    .map((r) => ({
      reward: r,
      variants: variantsByReward[r.id] ?? [],
    }))
    .filter((x) => x.variants.length > 0);

  return (
    <div className="space-y-4">
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

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Henüz çekim seçeneği yok. Bakiye biriktir, yakında açılır.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map(({ reward, variants: vs }) => (
            <div
              key={reward.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                {reward.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {vs.map((variant) => (
                  <RewardCardV2
                    key={variant.id}
                    reward={reward}
                    variant={variant}
                    userPoints={userPoints}
                    withdrawable={withdrawable}
                    minPoints={minPoints}
                    redeemEnabled={redeemEnabled}
                    onSuccess={() => setSuccessToast('Talebin alındı (beklemede)')}
                    onError={(msg) => setSuccessToast(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
