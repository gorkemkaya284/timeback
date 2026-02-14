'use client';

import { formatPoints } from '@/lib/utils';
import RedeemButton from './RedeemButton';

type Reward = {
  id: number;
  title: string;
  description: string | null;
  points_cost: number;
  stock: number;
  status: string;
  category?: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  digital: '🎁',
  cash: '💳',
  crypto: '₿',
  other: '✨',
};

export default function RewardCard({
  reward,
  userPoints,
  minThreshold,
}: {
  reward: Reward;
  userPoints: number;
  minThreshold: number;
}) {
  const canRedeem =
    userPoints >= reward.points_cost &&
    userPoints >= minThreshold &&
    reward.stock > 0 &&
    reward.status === 'active';
  const category = (reward.category ?? 'other') as keyof typeof CATEGORY_ICONS;
  const icon = CATEGORY_ICONS[category] ?? '✨';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {reward.title}
          </h3>
          {reward.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {reward.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formatPoints(reward.points_cost)} puan
            </span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="text-gray-500 dark:text-gray-400">5–10 dk</span>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <RedeemButton
          rewardId={reward.id}
          pointsCost={reward.points_cost}
          canRedeem={canRedeem}
          userPoints={userPoints}
          minThreshold={minThreshold}
          isClosed={reward.status !== 'active' || reward.stock <= 0}
        />
      </div>
    </div>
  );
}
