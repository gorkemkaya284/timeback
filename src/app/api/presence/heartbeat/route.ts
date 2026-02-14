import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/presence/heartbeat
 * Upserts user presence. Call every ~30s from authenticated client.
 * Uses server client (session) so RLS allows only own row.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('presence_heartbeats')
      .upsert(
        { user_id: user.id, last_seen: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[presence/heartbeat] Upsert error:', { code: error.code, message: error.message });
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[presence/heartbeat] Error:', err);
    return NextResponse.json({ ok: false, message: 'Internal error' }, { status: 500 });
  }
}
