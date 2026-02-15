import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { Database } from '@/types/database.types';

/**
 * GET /api/admin/redemptions/stats
 * Last 7 days: pending, approved, rejected, total counts.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 500 });
    }
    const admin = createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceIso = since.toISOString();

    const [pRes, aRes, rRes, fRes, tRes] = await Promise.all([
      admin.from('tb_reward_redemptions').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', sinceIso),
      admin.from('tb_reward_redemptions').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', sinceIso),
      admin.from('tb_reward_redemptions').select('*', { count: 'exact', head: true }).eq('status', 'rejected').gte('created_at', sinceIso),
      admin.from('tb_reward_redemptions').select('*', { count: 'exact', head: true }).eq('status', 'fulfilled').gte('created_at', sinceIso),
      admin.from('tb_reward_redemptions').select('*', { count: 'exact', head: true }).gte('created_at', sinceIso),
    ]);

    return NextResponse.json({
      ok: true,
      since: sinceIso,
      pending: pRes.count ?? 0,
      approved: aRes.count ?? 0,
      rejected: rRes.count ?? 0,
      fulfilled: fRes.count ?? 0,
      total: tRes.count ?? 0,
    });
  } catch (err) {
    console.error('[admin/redemptions/stats]', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
