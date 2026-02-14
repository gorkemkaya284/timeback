'use client';

import { useState } from 'react';
import { formatPoints } from '@/lib/utils';
import type { RewardV2, RewardVariantV2 } from './RewardsListV2';

export default function RewardCardV2({
  reward,
  variant,
  userPoints,
  withdrawable,
  minPoints,
  onSuccess,
  onError,
}: {
  reward: RewardV2;
  variant: RewardVariantV2;
  userPoints: number;
  withdrawable: number;
  minPoints: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const balance = Math.max(0, Number(withdrawable) || 0);
  const requiredPoints = variant.cost_points;
  const canRedeem =
    balance >= minPoints &&
    balance >= requiredPoints &&
    (variant.stock === null || variant.stock > 0);

  const disabled = loading || !canRedeem || success;

  const handleRedeem = async () => {
    if (disabled || loading) return;
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

      const msg = data.message ?? data.error ?? 'Talep işlenemedi';
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

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {variant.denomination_tl} TL = {formatPoints(variant.cost_points)} P
        </div>
        <button
          type="button"
          onClick={handleRedeem}
          disabled={disabled}
          title={!canRedeem ? `En az ${formatPoints(requiredPoints)} puan gerekir` : undefined}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            canRedeem && !loading && !success
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? 'İşleniyor...' : success ? '✓ Talebin alındı' : canRedeem ? 'Çek' : 'Yetersiz bakiye'}
        </button>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
