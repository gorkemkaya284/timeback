'use client';

import { useState, useMemo } from 'react';
import RewardCard from './RewardCard';

export type RewardCategory = 'all' | 'digital' | 'cash' | 'crypto' | 'other';

type Reward = {
  id: number;
  title: string;
  description: string | null;
  points_cost: number;
  stock: number;
  status: string;
  category?: RewardCategory;
};

const CATEGORIES: { id: RewardCategory; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'digital', label: 'Dijital kodlar' },
  { id: 'cash', label: 'Nakit / Cüzdan' },
  { id: 'crypto', label: 'Kripto' },
  { id: 'other', label: 'Diğer' },
];

// Basit kategori eşlemesi: başlık/açıklamaya göre (DB'de category yoksa)
function inferCategory(r: Reward): RewardCategory {
  const title = (r.title ?? '').toLowerCase();
  const desc = (r.description ?? '').toLowerCase();
  const text = `${title} ${desc}`;
  if (
    text.includes('steam') || text.includes('netflix') || text.includes('spotify') ||
    text.includes('google') || text.includes('itunes') || text.includes('dijital')
  )
    return 'digital';
  if (
    text.includes('papara') || text.includes('nakit') || text.includes('cüzdan') ||
    text.includes('paypal') || text.includes('payoneer') || text.includes('havale')
  )
    return 'cash';
  if (
    text.includes('btc') || text.includes('bitcoin') || text.includes('kripto') ||
    text.includes('crypto') || text.includes('eth') || text.includes('usdt')
  )
    return 'crypto';
  return 'other';
}

export default function RewardsList({
  rewards,
  userPoints,
  withdrawable,
  minPoints,
}: {
  rewards: Reward[];
  userPoints: number;
  withdrawable: number;
  minPoints: number;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RewardCategory>('all');

  const rewardsWithCategory = useMemo(
    () => rewards.map((r) => ({ ...r, category: inferCategory(r) })),
    [rewards]
  );

  const filtered = useMemo(() => {
    let list = rewardsWithCategory;
    if (category !== 'all') {
      list = list.filter((r) => r.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [rewardsWithCategory, category, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Ödül ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat.id
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {rewards.length === 0
              ? 'Henüz çekim seçeneği yok. Bakiye biriktir, yakında açılır.'
              : 'Bu kategoride ödül bulunamadı.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              userPoints={userPoints}
              withdrawable={withdrawable}
              minPoints={minPoints}
            />
          ))}
        </div>
      )}
    </div>
  );
}
