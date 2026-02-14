import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Extracts client IP from request headers (priority order).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri;
  const reqIp = (req as unknown as { ip?: string }).ip;
  if (reqIp) return reqIp;
  return '0.0.0.0';
}

/**
 * Log user IP activity to user_ip_logs for admin visibility.
 * Uses service role (never exposed to client).
 */
export async function logUserIp(params: {
  req: Request;
  userId: string;
  event: string;
  pathOverride?: string;
}): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;

  const ip = getClientIp(params.req);
  const userAgent = params.req.headers.get('user-agent') ?? null;
  let path: string | null = params.pathOverride ?? null;
  if (path === undefined || path === null) {
    try {
      path = new URL(params.req.url).pathname;
    } catch {
      path = null;
    }
  }

  const { error } = await admin.from('user_ip_logs').insert({
    user_id: params.userId,
    event: params.event,
    ip,
    user_agent: userAgent,
    path,
  });

  if (error) {
    console.error('[logUserIp] Insert error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }
}
