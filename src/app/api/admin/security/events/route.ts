import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

/**
 * GET /api/admin/security/events?event_type=...&user_id=...&ip=...&since=...&limit=200
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('event_type')?.trim();
    const userId = searchParams.get('user_id')?.trim();
    const ip = searchParams.get('ip')?.trim();
    const since = searchParams.get('since')?.trim();
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 200);

    let query = admin
      .from('tb_security_events')
      .select('id, user_id, event_type, ip, user_agent, device_fingerprint, country, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) query = query.eq('event_type', eventType);
    if (userId) query = query.eq('user_id', userId);
    if (ip) query = query.eq('ip', ip);
    if (since) query = query.gte('created_at', since);

    const { data, error } = await query;
    if (error) {
      console.error('[admin/security/events]', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (err) {
    console.error('[admin/security/events]', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
