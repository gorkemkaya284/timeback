import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

const ONLINE_WINDOW_SECONDS = 60;
const LIST_LIMIT = 20;

/**
 * GET /api/admin/presence/online
 * Returns online user count and optional list (last 60s heartbeats).
 * Service role for read.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { ok: false, message: 'Admin client disabled' },
        { status: 503 }
      );
    }

    const url = new URL(request.url);
    const withList = url.searchParams.get('list') === '1' || url.searchParams.get('list') === 'true';

    const { count: onlineCount, error: countError } = await adminClient
      .from('presence_heartbeats')
      .select('*', { count: 'exact', head: true })
      .gt('last_seen', new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString());

    if (countError) {
      console.error('[admin/presence/online] Count error:', { code: countError.code, message: countError.message });
      return NextResponse.json(
        { ok: false, message: countError.message },
        { status: 500 }
      );
    }

    let list: { user_id: string; last_seen: string }[] = [];
    if (withList) {
      const { data, error } = await adminClient
        .from('presence_heartbeats')
        .select('user_id, last_seen')
        .gt('last_seen', new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString())
        .order('last_seen', { ascending: false })
        .limit(LIST_LIMIT);

      if (!error) {
        list = (data ?? []).map((r) => ({ user_id: r.user_id, last_seen: r.last_seen }));
      }
    }

    return NextResponse.json({
      ok: true,
      online_count: onlineCount ?? 0,
      online_window_seconds: ONLINE_WINDOW_SECONDS,
      list: withList ? list : undefined,
    });
  } catch (err) {
    console.error('[admin/presence/online] Error:', err);
    return NextResponse.json(
      { ok: false, message: 'Internal error' },
      { status: 500 }
    );
  }
}
