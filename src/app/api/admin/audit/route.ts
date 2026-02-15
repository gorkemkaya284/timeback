import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await allowAdminAccess(user))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ entries: [] });
    }

    const { data, error } = await adminClient
      .from('tb_admin_audit_log')
      .select('id, admin_user_id, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch audit log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ entries: data || [] });
  } catch (error) {
    console.error('Admin audit GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
