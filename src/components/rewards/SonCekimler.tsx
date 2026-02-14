'use client';

const MOCK_WITHDRAWALS = [
  { name: 'Ayşe K.', amount: '45₺', time: '2 dk önce' },
  { name: 'Mehmet T.', amount: '120₺', time: '12 dk önce' },
  { name: 'Fatma Y.', amount: '80₺', time: '28 dk önce' },
  { name: 'Ali V.', amount: '200₺', time: '1 saat önce' },
  { name: 'Seda Ö.', amount: '65₺', time: '1 saat önce' },
];

export default function SonCekimler() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Son çekimler</h2>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {MOCK_WITHDRAWALS.map((w, i) => (
          <li key={i} className="px-4 py-2.5 flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-300">{w.name}</span>
            <span className="font-medium text-gray-900 dark:text-white">{w.amount}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">{w.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
