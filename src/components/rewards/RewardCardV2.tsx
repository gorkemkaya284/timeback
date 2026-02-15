'use client';

import { useState } from 'react';
import { formatPoints, isValidUuid } from '@/lib/utils';
import { getBrandConfig } from '@/config/reward-brands';
import type { RewardV2, RewardVariantV2 } from './RewardsListV2';

export default function RewardCardV2({
  reward,
  variant,
  userPoints,
  withdrawable,
  minPoints,
  redeemEnabled = true,
  onSuccess,
  onError,
}: {
  reward: RewardV2;
  variant: RewardVariantV2;
  userPoints: number;
  withdrawable: number;
  minPoints: number;
  redeemEnabled?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const brand = getBrandConfig(reward.title);
  const Icon = brand.icon;

  const balance = Math.max(0, Number(withdrawable) || 0);
  const requiredPoints = variant.cost_points;
  const canRedeem =
    redeemEnabled &&
    balance >= minPoints &&
    balance >= requiredPoints &&
    (variant.stock === null || variant.stock > 0);

  const disabled = loading || !canRedeem || success;

  const handleRedeem = async () => {
    if (disabled || loading || !redeemEnabled) return;
    if (!isValidUuid(variant.id)) {
      onError('Bu ödül şu an talep edilemez.');
      return;
    }
    setLoading(true);
    setError('');
    onError('');

    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          idempotencyKey,
          note: reward.kind === 'bank_transfer' ? undefined : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setSuccess(true);
        onSuccess();
        return;
      }

      const msg =
        data.ok === false && data.reason === 'risk_block'
          ? 'Güvenlik kontrolü nedeniyle talep reddedildi. Lütfen daha sonra tekrar deneyin.'
          : (data.message ?? data.error ?? 'Talep işlenemedi');
      setError(msg);
      onError(msg);
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

  const isBankTransfer = reward.kind === 'bank_transfer';
  const deliveryChip = isBankTransfer ? 'Manuel onay' : 'Anında';
  const limitChip = variant.daily_limit_per_user ? `Limit: ${variant.daily_limit_per_user}/gün` : null;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${brand.gradient}`} aria-hidden />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-1.5 bg-gradient-to-br ${brand.gradient}`}>
              <Icon className="h-5 w-5 text-gray-700 dark:text-gray-200" strokeWidth={2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {variant.denomination_tl} TL
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                = {formatPoints(variant.cost_points)} P
              </div>
            </div>
          </div>
          {redeemEnabled ? null : (
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              Yakında
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {variant.denomination_tl} TL = {formatPoints(variant.cost_points)} P
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {deliveryChip}
          </span>
          {limitChip && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {limitChip}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleRedeem}
          disabled={disabled}
          title={
            !redeemEnabled
              ? 'Ödüller yakında aktif olacak'
              : !canRedeem
                ? `En az ${formatPoints(requiredPoints)} puan gerekir`
                : undefined
          }
          className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            canRedeem && !loading && !success
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {buttonLabel}
        </button>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
