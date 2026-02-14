import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logUserIp } from '@/lib/user-ip-log';

/**
 * POST /api/auth/log-activity
 * Logs IP for login event. Called by client after signInWithPassword.
 * Session must be established (cookies set by Supabase client).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { event?: string };
    const event = body.event ?? 'login';

    await logUserIp({ req: request, userId: user.id, event });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[auth/log-activity] Error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
