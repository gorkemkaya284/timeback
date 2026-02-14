'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatPoints, isValidUuid } from '@/lib/utils';
import { getBrandConfig } from '@/config/reward-brands';
import type { RewardV2, RewardVariantV2 } from './RewardsListV2';

export default function RewardCardFull({
  reward,
  variants,
  withdrawable,
  minPoints,
  redeemEnabled = true,
  onSuccess,
  onError,
  onInsufficientBalance,
}: {
  reward: RewardV2;
  variants: RewardVariantV2[];
  withdrawable: number;
  minPoints: number;
  redeemEnabled?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onInsufficientBalance: (msg: string) => void;
}) {
  const brand = getBrandConfig(reward.title);
  const [selectedVariant, setSelectedVariant] = useState<RewardVariantV2>(variants[0]!);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const balance = Math.max(0, Number(withdrawable) || 0);
  const requiredPoints = selectedVariant.cost_points;

  const handleRedeem = async () => {
    if (!redeemEnabled) return;
    if (loading || success) return;

    if (!isValidUuid(selectedVariant.id)) {
      onError('Bu ödül şu an talep edilemez. Veritabanı bağlantısı gerekli.');
      return;
    }

    if (balance < minPoints) {
      onInsufficientBalance(`Minimum çekim: ${formatPoints(minPoints)} P`);
      return;
    }
    if (balance < requiredPoints) {
      onInsufficientBalance(`Yetersiz bakiye: ${formatPoints(requiredPoints)} P gerekli`);
      return;
    }

    setLoading(true);
    onError('');

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          idempotencyKey: crypto.randomUUID(),
          note: reward.kind === 'bank_transfer' ? undefined : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setSuccess(true);
        onSuccess();
      } else {
        const err = data.error as { message?: string; code?: string } | undefined;
        const msg = err?.message ?? data.message ?? 'Talep işlenemedi';
        const code = err?.code;
        onError(code ? `${msg} (${code})` : msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu';
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const buttonDisabled = !redeemEnabled || loading || success;
  const buttonLabel = !redeemEnabled
    ? 'Yakında'
    : loading
      ? 'İşleniyor...'
      : success
        ? '✓ Talep alındı'
        : 'Talep Et';

  const imagePath =
    reward.image_url && String(reward.image_url).trim().length > 0 && String(reward.image_url).startsWith('/')
      ? reward.image_url
      : brand.imagePath || '/rewards/placeholder.svg';

  return (
    <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
      <div className="relative aspect-[3/2] w-full bg-gray-100 dark:bg-gray-800">
        <Image
          src={imagePath}
          alt={brand.displayName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-t ${brand.gradient} from-black/60 via-transparent to-transparent`}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white text-lg drop-shadow-lg">{brand.displayName}</h3>
          <p className="text-white/90 text-sm">{brand.subtitle}</p>
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {!redeemEnabled && (
            <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-amber-500/90 text-white shadow">
              Yakında
            </span>
          )}
          {brand.badge && redeemEnabled && (
            <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white/90 text-gray-800">
              {brand.badge}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedVariant(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedVariant.id === v.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {v.denomination_tl} TL
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Seçilen: {selectedVariant.denomination_tl} TL = {formatPoints(selectedVariant.cost_points)} P
        </p>

        <button
          type="button"
          onClick={handleRedeem}
          disabled={buttonDisabled}
          className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            !buttonDisabled
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
