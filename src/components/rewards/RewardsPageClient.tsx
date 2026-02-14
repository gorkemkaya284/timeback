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
    fetch('/api/rewards')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Fetch failed'))))
      .then((data) => {
        if (cancelled) return;
        const r = data.rewards ?? [];
        const v = data.variants ?? [];
        if (r.length > 0 && v.length > 0) {
          setRewards(r);
          setVariants(v);
          setUseFallback(false);
        } else {
          setRewards(FALLBACK_REWARDS);
          setVariants(FALLBACK_VARIANTS);
          setUseFallback(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRewards(FALLBACK_REWARDS);
          setVariants(FALLBACK_VARIANTS);
          setUseFallback(true);
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
