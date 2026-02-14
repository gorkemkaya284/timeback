import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logUserIp } from '@/lib/user-ip-log';

/**
 * POST /api/ip/log-login
 * Logs IP for login event. Call from client when session is established.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    await logUserIp({ req: request, userId: user.id, event: 'login', pathOverride: '/api/ip/log-login' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[ip/log-login] Error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
