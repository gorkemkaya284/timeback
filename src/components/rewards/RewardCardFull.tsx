'use client';

import { useState } from 'react';
import { formatPoints } from '@/lib/utils';
import { getBrandConfig } from '@/config/reward-brands';
import type { RewardV2, RewardVariantV2 } from './RewardsListV2';

export default function RewardCardFull({
  reward,
  variants,
  userPoints,
  withdrawable,
  minPoints,
  redeemEnabled = true,
  onSuccess,
  onError,
}: {
  reward: RewardV2;
  variants: RewardVariantV2[];
  userPoints: number;
  withdrawable: number;
  minPoints: number;
  redeemEnabled?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const brand = getBrandConfig(reward.title);
  const Icon = brand.icon;
  const isBankTransfer = reward.kind === 'bank_transfer';

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${brand.gradient}`} aria-hidden />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 bg-gradient-to-br ${brand.gradient}`}>
              <Icon className="h-6 w-6 text-gray-700 dark:text-gray-200" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{brand.displayName}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{brand.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {!redeemEnabled && (
              <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                Yakında
              </span>
            )}
            {brand.badge && redeemEnabled && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {brand.badge}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {variants.map((variant) => (
            <VariantRow
              key={variant.id}
              reward={reward}
              variant={variant}
              withdrawable={withdrawable}
              minPoints={minPoints}
              redeemEnabled={redeemEnabled}
              onSuccess={onSuccess}
              onError={onError}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VariantRow({
  reward,
  variant,
  withdrawable,
  minPoints,
  redeemEnabled,
  onSuccess,
  onError,
}: {
  reward: RewardV2;
  variant: RewardVariantV2;
  withdrawable: number;
  minPoints: number;
  redeemEnabled: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const balance = Math.max(0, Number(withdrawable) || 0);
  const requiredPoints = variant.cost_points;
  const canRedeem =
    redeemEnabled &&
    balance >= minPoints &&
    balance >= requiredPoints &&
    (variant.stock === null || variant.stock > 0);

  const disabled = loading || !canRedeem || success;
  const isBankTransfer = reward.kind === 'bank_transfer';

  const handleRedeem = async () => {
    if (disabled || loading || !redeemEnabled) return;
    setLoading(true);
    setError('');
    onError('');

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          idempotencyKey: crypto.randomUUID(),
          note: isBankTransfer ? undefined : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setSuccess(true);
        onSuccess();
      } else {
        const msg = data.message ?? data.error ?? 'Talep işlenemedi';
        setError(msg);
        onError(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = !redeemEnabled
    ? 'Yakında'
    : loading
      ? 'İşleniyor...'
      : success
        ? '✓ Talep alındı'
        : canRedeem
          ? 'Talep Et'
          : 'Yetersiz bakiye';

  const deliveryChip = isBankTransfer ? 'Manuel onay' : 'Anında';
  const limitChip = variant.daily_limit_per_user ? `${variant.daily_limit_per_user}/gün` : null;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {variant.denomination_tl} TL = {formatPoints(variant.cost_points)} P
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
        <span className="text-xs text-gray-600 dark:text-gray-400">{deliveryChip}</span>
        {limitChip && (
          <>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-blue-600 dark:text-blue-400">Limit: {limitChip}</span>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRedeem}
          disabled={disabled}
          title={!redeemEnabled ? 'Yakında' : !canRedeem ? `En az ${formatPoints(requiredPoints)} P` : undefined}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            canRedeem && !loading && !success
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {buttonLabel}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
