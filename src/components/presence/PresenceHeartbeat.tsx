'use client';

import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Sends presence heartbeat every 30s. Mount inside authenticated app shell only.
 */
export default function PresenceHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const send = () => {
      fetch('/api/presence/heartbeat', { method: 'POST', credentials: 'include' }).catch(() => {
        // Ignore; next tick will retry
      });
    };

    send(); // First ping immediately
    intervalRef.current = setInterval(send, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}
