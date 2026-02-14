'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RedeemButton({
  rewardId,
  pointsCost,
  canRedeem,
  withdrawable,
  minPoints,
  compact,
  isClosed,
  onError,
}: {
  rewardId: number;
  pointsCost: number;
  canRedeem: boolean;
  withdrawable: number;
  minPoints: number;
  compact?: boolean;
  isClosed?: boolean;
  onError?: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const balance = Math.max(0, Number(withdrawable) || 0);
  const required_points = Math.max(0, Number(pointsCost) || 0);
  const minPts = Math.max(1, Number(minPoints) || 100);

  const balanceLoading = typeof withdrawable !== 'number' || isNaN(withdrawable);
  const insufficientMin = balance < minPts;
  const insufficientForReward = balance >= minPts && balance < required_points;

  let buttonText = 'Çek';
  let disabled = loading || isClosed;

  if (isClosed) {
    buttonText = 'Yakında';
  } else if (balanceLoading) {
    buttonText = 'Bakiye yükleniyor';
    disabled = true;
  } else if (balance === 0 || insufficientMin) {
    buttonText = `Minimum çekim: ${minPts} P`;
    disabled = true;
  } else if (insufficientForReward) {
    buttonText = `Yetersiz bakiye (${required_points} P gerekir)`;
    disabled = true;
  } else if (!canRedeem) {
    buttonText = 'Yetersiz bakiye';
    disabled = true;
  }

  const handleRedeem = async () => {
    if (disabled || loading) return;
    if (balance < minPts) return;
    if (balance < required_points) return;

    setLoading(true);
    setError('');
    setSuccess(false);
    onError?.('');

    try {
      const response = await fetch('/api/redemptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rewardId }),
      });

      const data = await response.json();
      const errMsg = data.error || 'Talep işlenemedi';

      if (!response.ok) {
        setError(errMsg);
        onError?.(errMsg);
        router.push(`/app/rewards?error=${encodeURIComponent(errMsg)}`);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/app/rewards?success=1');
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(msg);
      onError?.(msg);
      router.push(`/app/rewards?error=${encodeURIComponent(msg)}`);
      setLoading(false);
    }
  };

  return (
    <div className={compact ? 'inline-block' : ''}>
      <button
        onClick={handleRedeem}
        disabled={disabled}
        className={`rounded-lg font-medium transition-colors ${
          compact ? 'py-1.5 px-3 text-xs' : 'w-full py-2.5 px-4 text-sm'
        } ${
          canRedeem && !loading && !success
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : success
            ? 'bg-green-600 text-white cursor-default'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        }`}
      >
        {loading ? 'İşleniyor...' : success ? '✓ Tamamlandı' : buttonText}
      </button>
      {!compact && error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {!compact && success && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">Tamamlandı. Yenileniyor...</p>
      )}
    </div>
  );
}
