import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

/**
 * GET /api/admin/security/suspicious-ips
 * Last 24h: IPs with >= 3 distinct users. Returns ip, distinct_users, event_count.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 500 });
    }

    const since24h = new Date();
    since24h.setHours(since24h.getHours() - 24);
    const since24hIso = since24h.toISOString();

    const { data: events, error } = await admin
      .from('tb_security_events')
      .select('ip, user_id')
      .gte('created_at', since24hIso)
      .not('user_id', 'is', null);

    if (error) {
      console.error('[admin/security/suspicious-ips]', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const byIp = new Map<string, { users: Set<string>; count: number }>();
    for (const row of events ?? []) {
      const ip = (row as { ip: string; user_id: string }).ip;
      const uid = (row as { ip: string; user_id: string }).user_id;
      if (!ip) continue;
      const cur = byIp.get(ip) ?? { users: new Set<string>(), count: 0 };
      cur.users.add(uid);
      cur.count += 1;
      byIp.set(ip, cur);
    }

    const suspicious = Array.from(byIp.entries())
      .filter(([, v]) => v.users.size >= 3)
      .map(([ip, v]) => ({ ip, distinct_users: v.users.size, event_count: v.count }))
      .sort((a, b) => b.distinct_users - a.distinct_users)
      .slice(0, 50);

    return NextResponse.json({ ok: true, data: suspicious });
  } catch (err) {
    console.error('[admin/security/suspicious-ips]', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
