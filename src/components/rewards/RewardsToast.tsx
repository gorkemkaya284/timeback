'use client';

import { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

export default function RewardsToast({
  message,
  type = 'error',
  onDismiss,
  duration = 4000,
}: {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  const bg =
    type === 'success'
      ? 'bg-green-600'
      : type === 'error'
        ? 'bg-red-600'
        : 'bg-gray-800';

  return (
    <div
      role="alert"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${bg} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium`}
    >
      {message}
    </div>
  );
}
