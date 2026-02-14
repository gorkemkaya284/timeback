import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

/**
 * GET /api/admin/redemptions?status=pending
 * Returns reward_redemptions (default: last 50 pending). Service role.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ redemptions: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending';

    const { data, error } = await admin
      .from('reward_redemptions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Admin redemptions GET:', error);
      return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 });
    }

    return NextResponse.json({ redemptions: data ?? [] });
  } catch (err) {
    console.error('Admin redemptions GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
