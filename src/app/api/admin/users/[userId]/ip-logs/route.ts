import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

const LIMIT = 20;

/**
 * GET /api/admin/users/[userId]/ip-logs
 * Returns last 20 IP logs for a user. Admin only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'userId required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, message: 'Admin client disabled' }, { status: 503 });
    }

    const { data, error } = await adminClient
      .from('user_ip_logs')
      .select('ip, event, path, user_agent, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(LIMIT);

    if (error) {
      console.error('[admin/users/ip-logs] Select error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, logs: data ?? [] });
  } catch (err) {
    console.error('[admin/users/ip-logs] Error:', err);
    return NextResponse.json({ ok: false, message: 'Internal error' }, { status: 500 });
  }
}
