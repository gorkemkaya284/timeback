'use client';

import { useState, useEffect } from 'react';
import { FALLBACK_REWARDS, FALLBACK_VARIANTS } from '@/config/rewards-fallback';
import RewardsListV2, { type RewardV2, type RewardVariantV2 } from './RewardsListV2';

export default function RewardsPageClient({
  userPoints,
  withdrawable,
  minPoints,
  redeemEnabled: configRedeemEnabled,
}: {
  userPoints: number;
  withdrawable: number;
  minPoints: number;
  redeemEnabled: boolean;
}) {
  const [rewards, setRewards] = useState<RewardV2[]>(FALLBACK_REWARDS);
  const [variants, setVariants] = useState<RewardVariantV2[]>(FALLBACK_VARIANTS);
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/rewards', { cache: 'no-store' })
      .then((res) => res.json().catch(() => ({})))
      .then((data: { ok?: boolean; reason?: string; rewardsCount?: number; variantsCount?: number; rewards?: RewardV2[]; variants?: RewardVariantV2[] }) => {
        if (cancelled) return;
        const ok = data.ok === true;
        const variantsCount = Number(data.variantsCount ?? 0);
        const useDb = ok && variantsCount > 0;
        if (useDb && Array.isArray(data.rewards) && Array.isArray(data.variants)) {
          setRewards(data.rewards);
          setVariants(data.variants);
          setUseFallback(false);
        } else {
          setRewards(FALLBACK_REWARDS);
          setVariants(FALLBACK_VARIANTS);
          setUseFallback(true);
          if (!ok && data.reason) {
            console.error('[rewards] API error reason:', data.reason, data);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRewards(FALLBACK_REWARDS);
          setVariants(FALLBACK_VARIANTS);
          setUseFallback(true);
          console.error('[rewards] Fetch failed:', err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const redeemEnabled = configRedeemEnabled && !useFallback;

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Ödüller yükleniyor...</p>
      </div>
    );
  }

  return (
    <RewardsListV2
      rewards={rewards}
      variants={variants}
      userPoints={userPoints}
      withdrawable={withdrawable}
      minPoints={minPoints}
      redeemEnabled={redeemEnabled}
      useFallback={useFallback}
    />
  );
}
