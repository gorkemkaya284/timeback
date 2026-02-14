'use client';

import { useEffect, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'ip_logged_for_session_';

/**
 * Calls POST /api/ip/log-login once per session (localStorage flag).
 * Runs when user lands on authenticated /app/* layout.
 */
export default function IpLogOnMount({ userId }: { userId: string }) {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    if (typeof window !== 'undefined' && window.localStorage?.getItem(key) === '1') {
      doneRef.current = true;
      return;
    }

    doneRef.current = true;
    fetch('/api/ip/log-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then((res) => {
        if (res.ok) {
          try {
            window.localStorage?.setItem(key, '1');
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        doneRef.current = false; // allow retry on next mount
      });
  }, [userId]);

  return null;
}
