'use client';

import { useState, useEffect } from 'react';
import { FALLBACK_REWARDS, FALLBACK_VARIANTS } from '@/config/rewards-fallback';
import RewardsListV2, { type RewardV2, type RewardVariantV2 } from './RewardsListV2';

/** Build rewards with nested variants for fallback (no UUIDs, redeem disabled). */
function getFallbackRewardsWithVariants(): Array<RewardV2 & { variants: RewardVariantV2[] }> {
  return FALLBACK_REWARDS.map((r) => ({
    ...r,
    variants: FALLBACK_VARIANTS.filter((v) => v.reward_id === r.id),
  })).filter((r) => r.variants.length > 0);
}

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
  const [rewards, setRewards] = useState<Array<RewardV2 & { variants: RewardVariantV2[] }>>(getFallbackRewardsWithVariants());
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/rewards', { cache: 'no-store' })
      .then((res) => res.json().catch(() => ({})))
      .then((data: { ok?: boolean; reason?: string; rewards?: Array<RewardV2 & { variants: RewardVariantV2[] }> }) => {
        if (cancelled) return;
        const ok = data.ok === true;
        const list = Array.isArray(data.rewards) ? data.rewards : [];
        const useDb = ok && list.length > 0;
        if (useDb) {
          setRewards(list);
          setUseFallback(false);
        } else {
          setRewards(getFallbackRewardsWithVariants());
          setUseFallback(true);
          if (!ok && data.reason) {
            console.error('[rewards] API error reason:', data.reason, data);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRewards(getFallbackRewardsWithVariants());
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
      userPoints={userPoints}
      withdrawable={withdrawable}
      minPoints={minPoints}
      redeemEnabled={redeemEnabled}
      useFallback={useFallback}
    />
  );
}
