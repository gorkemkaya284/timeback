import 'server-only';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export type SecurityEventType =
  | 'redeem_attempt'
  | 'redeem_success'
  | 'redeem_blocked'
  | 'login'
  | 'session_refresh'
  | 'offerwall_click'
  | 'offerwall_postback'
  | 'admin_action';

function getClientIp(h: Headers): string {
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const rip = h.get('x-real-ip');
  if (rip) return rip.trim();
  return '127.0.0.1';
}

export async function logSecurityEvent(params: {
  userId: string;
  eventType: SecurityEventType;
  metadata?: Record<string, unknown>;
  deviceFingerprint?: string | null;
}) {
  if (!params.userId) return;
  try {
    const h = await headers();
    const ip = getClientIp(h);
    const ua = h.get('user-agent') ?? 'unknown';

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return;

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    await supabase.rpc('log_security_event', {
      p_user_id: params.userId,
      p_event_type: params.eventType,
      p_ip: ip,
      p_user_agent: ua,
      p_device_fingerprint: params.deviceFingerprint ?? null,
      p_metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.error('[security] logSecurityEvent failed', e);
  }
}
