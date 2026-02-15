/**
 * Server-only: log security events to tb_security_events.
 * Uses service role; no-op if key missing.
 * IP/UA from headers (Vercel/Next App Router); device_fingerprint from header or cookie.
 */

import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';
import type { Json } from '@/types/database.types';

export type SecurityEventType =
  | 'login'
  | 'session_refresh'
  | 'offerwall_click'
  | 'offerwall_postback'
  | 'offerwall_credit_attempt'
  | 'offerwall_credited'
  | 'redeem_attempt'
  | 'redeem_success'
  | 'redeem_blocked'
  | 'admin_action';

function getClientIp(headersList: Headers): string {
  const xff = headersList.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = headersList.get('x-real-ip');
  if (xri) return xri.trim();
  return '0.0.0.0';
}

function getDeviceFingerprint(headersList: Headers): string | null {
  const h = headersList.get('x-device-fingerprint');
  if (h?.trim()) return h.trim();
  const cookie = headersList.get('cookie');
  if (cookie) {
    const m = cookie.match(/(?:^|;\s*)device_fingerprint=([^;]+)/);
    if (m?.[1]) return decodeURIComponent(m[1].trim());
  }
  return null;
}

export type LogSecurityEventParams = {
  event_type: SecurityEventType;
  metadata?: Record<string, unknown>;
  user_id?: string | null;
  /** Override IP (e.g. from postback); otherwise from headers */
  ip?: string | null;
  /** Override user_agent */
  user_agent?: string | null;
  /** Override device_fingerprint */
  device_fingerprint?: string | null;
  country?: string | null;
};

/**
 * Log a security event. Call from server actions/route handlers only.
 * IP/UA/fingerprint are taken from request headers when not provided.
 */
export async function logSecurityEvent(params: LogSecurityEventParams): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;

  const headersList = await headers();
  const ip = params.ip ?? getClientIp(headersList);
  const user_agent = params.user_agent ?? headersList.get('user-agent') ?? '';
  const device_fingerprint = params.device_fingerprint ?? getDeviceFingerprint(headersList);

  try {
    await admin.from('tb_security_events').insert({
      user_id: params.user_id ?? null,
      event_type: params.event_type,
      ip,
      user_agent: user_agent.slice(0, 2048),
      device_fingerprint: device_fingerprint?.slice(0, 512) ?? null,
      country: params.country ?? null,
      metadata: (params.metadata ?? {}) as Json,
    });
  } catch (err) {
    console.error('[logSecurityEvent]', params.event_type, err);
  }
}
