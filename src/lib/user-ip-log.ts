import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Extracts client IP from request headers (priority order).
 */
function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  return (req as unknown as { ip?: string }).ip ?? null;
}

/**
 * Log user IP activity to user_ip_logs for admin visibility.
 */
export async function logUserIp(params: {
  req: Request;
  userId: string;
  event: string;
}): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;

  const ip = getClientIp(params.req);
  const userAgent = params.req.headers.get('user-agent') ?? null;
  let path: string | null = null;
  try {
    path = new URL(params.req.url).pathname;
  } catch {
    path = null;
  }

  await admin.from('user_ip_logs').insert({
    user_id: params.userId,
    event: params.event,
    ip,
    user_agent: userAgent,
    path,
  });
}
