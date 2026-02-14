'use client';

import { useEffect, useState } from 'react';

interface Reward {
  id: string;
  title: string;
  provider: string;
  kind: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface RewardVariant {
  id: string;
  reward_id: string;
  denomination_tl: number;
  cost_points: number;
  stock: number | null;
  daily_limit_per_user: number | null;
  min_account_age_days: number | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [variants, setVariants] = useState<RewardVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<RewardVariant | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/rewards');
      const data = await res.json();
      if (res.ok) {
        setRewards(data.rewards ?? []);
        setVariants(data.variants ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRewardSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      title: (form.elements.namedItem('title') as HTMLInputElement).value.trim(),
      kind: (form.elements.namedItem('kind') as HTMLSelectElement).value,
      is_active: (form.elements.namedItem('reward_active') as HTMLSelectElement).value === 'true',
      sort_order: parseInt((form.elements.namedItem('sort_order') as HTMLInputElement).value, 10) || 0,
    };

    try {
      const url = editingReward ? `/api/admin/rewards/${editingReward.id}` : '/api/admin/rewards';
      const method = editingReward ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchData();
        setShowForm(false);
        setEditingReward(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVariantSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const denom = parseInt((form.elements.namedItem('denomination_tl') as HTMLInputElement).value, 10);
    const stockVal = (form.elements.namedItem('stock') as HTMLInputElement).value;
    const dailyLimitVal = (form.elements.namedItem('daily_limit') as HTMLInputElement).value;
    const minAgeVal = (form.elements.namedItem('min_account_age') as HTMLInputElement).value;

    const payload = editingVariant
      ? {
          denomination_tl: denom,
          cost_points: denom * 100,
          stock: stockVal === '' ? null : parseInt(stockVal, 10),
          daily_limit_per_user: dailyLimitVal === '' ? null : parseInt(dailyLimitVal, 10),
          min_account_age_days: minAgeVal === '' ? null : parseInt(minAgeVal, 10),
          is_active: (form.elements.namedItem('variant_active') as HTMLSelectElement).value === 'true',
        }
      : {
          reward_id: (form.elements.namedItem('reward_id') as HTMLSelectElement).value,
          denomination_tl: denom,
          cost_points: denom * 100,
          stock: stockVal === '' ? null : parseInt(stockVal, 10),
          daily_limit_per_user: dailyLimitVal === '' ? null : parseInt(dailyLimitVal, 10),
          min_account_age_days: minAgeVal === '' ? null : parseInt(minAgeVal, 10),
          is_active: (form.elements.namedItem('variant_active') as HTMLSelectElement).value === 'true',
        };

    try {
      const url = editingVariant ? `/api/admin/reward-variants/${editingVariant.id}` : '/api/admin/reward-variants';
      const method = editingVariant ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchData();
        setShowVariantForm(false);
        setEditingVariant(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Ödüller yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => { setEditingReward(null); setShowForm(true); }}
          className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md hover:opacity-90"
        >
          Yeni ödül ekle
        </button>
        <button
          onClick={() => { setEditingVariant(null); setShowVariantForm(true); }}
          className="bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 px-4 py-2 rounded-md hover:opacity-90"
        >
          Yeni varyant ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4">{editingReward ? 'Ödülü düzenle' : 'Yeni ödül'}</h3>
          <form onSubmit={handleRewardSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Başlık</label>
              <input name="title" type="text" required defaultValue={editingReward?.title} className="w-full rounded border px-3 py-2 dark:bg-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tür</label>
              <select name="kind" defaultValue={editingReward?.kind ?? 'gift'} className="w-full rounded border px-3 py-2 dark:bg-gray-900">
                <option value="gift">Dijital / Hediye</option>
                <option value="bank_transfer">Banka Havalesi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Aktif</label>
              <select name="reward_active" defaultValue={editingReward?.is_active ? 'true' : 'false'} className="w-full rounded border px-3 py-2 dark:bg-gray-900">
                <option value="true">Evet</option>
                <option value="false">Hayır</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sıra</label>
              <input name="sort_order" type="number" defaultValue={editingReward?.sort_order ?? 0} className="w-full rounded border px-3 py-2 dark:bg-gray-900" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded">Kaydet</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingReward(null); }} className="px-4 py-2 rounded border">İptal</button>
            </div>
          </form>
        </div>
      )}

      {showVariantForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4">{editingVariant ? 'Varyantı düzenle' : 'Yeni varyant'}</h3>
          <form onSubmit={handleVariantSubmit} className="space-y-4">
            {!editingVariant && (
              <div>
                <label className="block text-sm font-medium mb-1">Ödül</label>
                <select name="reward_id" required className="w-full rounded border px-3 py-2 dark:bg-gray-900">
                  {rewards.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Tutar (TL)</label>
              <input name="denomination_tl" type="number" required min="1" defaultValue={editingVariant?.denomination_tl} className="w-full rounded border px-3 py-2 dark:bg-gray-900" />
              <p className="text-xs text-gray-500 mt-1">Puan = TL × 100 (otomatik)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stok (boş = sınırsız)</label>
              <input name="stock" type="number" min="0" placeholder="Sınırsız" defaultValue={editingVariant?.stock ?? ''} className="w-full rounded border px-3 py-2 dark:bg-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Günlük limit (kullanıcı başına)</label>
              <input name="daily_limit" type="number" min="0" placeholder="Yok" defaultValue={editingVariant?.daily_limit_per_user ?? ''} className="w-full rounded border px-3 py-2 dark:bg-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min hesap yaşı (gün)</label>
              <input name="min_account_age" type="number" min="0" placeholder="Yok" defaultValue={editingVariant?.min_account_age_days ?? ''} className="w-full rounded border px-3 py-2 dark:bg-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Aktif</label>
              <select name="variant_active" defaultValue={editingVariant?.is_active ? 'true' : 'false'} className="w-full rounded border px-3 py-2 dark:bg-gray-900">
                <option value="true">Evet</option>
                <option value="false">Hayır</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded">Kaydet</button>
              <button type="button" onClick={() => { setShowVariantForm(false); setEditingVariant(null); }} className="px-4 py-2 rounded border">İptal</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Ödül</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">TL</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Puan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Stok</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Aktif</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rewards.map((r) => {
              const vs = variants.filter((v) => v.reward_id === r.id);
              if (vs.length === 0) {
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{r.title}</td>
                    <td colSpan={5} className="px-4 py-2 text-sm text-gray-500">Varyant yok</td>
                  </tr>
                );
              }
              return vs.map((v, idx) => (
                <tr key={v.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    {r.title}
                    {idx === 0 && (
                      <button
                        type="button"
                        onClick={() => { setEditingReward(r); setShowForm(true); }}
                        className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        (düzenle)
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">{v.denomination_tl} TL</td>
                  <td className="px-4 py-2 text-sm">{v.cost_points} P</td>
                  <td className="px-4 py-2 text-sm">{v.stock == null ? '∞' : v.stock}</td>
                  <td className="px-4 py-2 text-sm">{v.is_active ? 'Evet' : 'Hayır'}</td>
                  <td className="px-4 py-2 text-sm">
                    <button
                      type="button"
                      onClick={() => { setEditingVariant(v); setShowVariantForm(true); }}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Düzenle
                    </button>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
