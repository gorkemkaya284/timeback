import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/dev';
import { getAdminClient } from '@/lib/supabase/admin';
import { canUserAct } from '@/lib/utils-server';

/**
 * POST /api/system-check/seed — add 100 points for current user (test only).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await canUserAct(user.id))) {
    return NextResponse.json({ error: 'Account is banned' }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Service role key missing' },
      { status: 503 }
    );
  }

  const { error } = await admin.from('points_ledger').insert({
    user_id: user.id,
    delta: 100,
    type: 'credit',
    reason: 'system_check_seed',
    ref_type: 'system_check',
    ref_id: null,
  });

  if (error) {
    console.error('System-check seed error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Ledger insert failed' },
      { status: 500 }
    );
  }

  const { data: total } = await admin.rpc('get_user_points', { p_user_id: user.id });
  const newTotal = typeof total === 'number' ? total : 0;

  return NextResponse.json({ success: true, newTotal });
}
