'use client';

import { useEffect, useState } from 'react';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  stock: number;
  status: string;
}

export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/admin/rewards');
      const data = await response.json();
      if (response.ok) {
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const stockRaw = formData.get('stock') as string | null;
    const stockParsed = stockRaw != null && stockRaw !== '' ? parseInt(stockRaw, 10) : NaN;
    const stock = !isNaN(stockParsed) && stockParsed >= 0 ? stockParsed : 999999;
    const data = {
      title: formData.get('title'),
      points_cost: parseInt(formData.get('points_cost') as string, 10),
      stock,
      status: formData.get('status') === 'inactive' ? 'inactive' : 'active',
    };

    try {
      const url = editingReward
        ? `/api/admin/rewards?id=${editingReward.id}`
        : '/api/admin/rewards';
      const method = editingReward ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        fetchRewards();
        setShowForm(false);
        setEditingReward(null);
      }
    } catch (error) {
      console.error('Failed to save reward:', error);
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setShowForm(true);
  };

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Ödüller yükleniyor...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => {
            setEditingReward(null);
            setShowForm(true);
          }}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Yeni ödül ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingReward ? 'Ödülü düzenle' : 'Yeni ödül oluştur'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Başlık
              </label>
              <input
                type="text"
                name="title"
                required
                defaultValue={editingReward?.title}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Puan değeri
                </label>
                <input
                  type="number"
                  name="points_cost"
                  required
                  min="1"
                  defaultValue={editingReward?.points_cost}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stok (0 = bitti)
                </label>
                <input
                  type="number"
                  name="stock"
                  min="0"
                  placeholder="Sınırsız için boş bırak"
                  defaultValue={editingReward?.stock != null && editingReward.stock < 999999 ? editingReward.stock : ''}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Durum
              </label>
              <select
                name="status"
                defaultValue={editingReward?.status === 'inactive' ? 'inactive' : 'active'}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Yakında / Kapalı</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
              >
                {editingReward ? 'Güncelle' : 'Oluştur'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingReward(null);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Başlık
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Puan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stok
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rewards.map((reward) => (
                <tr key={reward.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{reward.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {reward.points_cost}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {reward.stock >= 999999 ? 'Sınırsız' : reward.stock}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
                      {reward.status === 'active' ? 'Aktif' : 'Kapalı'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleEdit(reward)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
