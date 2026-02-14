'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RewardsFeedbackBanner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success === '1') {
      setMessage({ type: 'success', text: "Çekim talebin alındı. Durumu 'Geçmiş' sayfasından takip edebilirsin." });
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
    } else {
      setMessage(null);
    }
  }, [searchParams]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm ${
        message.type === 'success'
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span>{message.text}</span>
        {message.type === 'success' && (
          <Link
            href="/app/history"
            className="font-medium underline hover:no-underline"
          >
            Geçmişe git
          </Link>
        )}
      </div>
    </div>
  );
}
