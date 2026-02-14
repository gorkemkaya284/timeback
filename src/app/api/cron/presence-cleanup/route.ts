import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * DELETE /api/cron/presence-cleanup
 * Removes heartbeat rows older than 7 days.
 * Call via Vercel cron: add to vercel.json "crons": [{ "path": "/api/cron/presence-cleanup", "schedule": "0 3 * * *" }]
 * Secure with CRON_SECRET header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.replace(/^Bearer\s+/i, '') || request.headers.get('x-cron-secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, message: 'Admin client disabled' }, { status: 503 });
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await adminClient
      .from('presence_heartbeats')
      .delete()
      .lt('last_seen', cutoff)
      .select('user_id');

    if (error) {
      console.error('[cron/presence-cleanup] Error:', { code: error.code, message: error.message });
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    const deleted = Array.isArray(data) ? data.length : 0;
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error('[cron/presence-cleanup] Error:', err);
    return NextResponse.json({ ok: false, message: 'Internal error' }, { status: 500 });
  }
}
