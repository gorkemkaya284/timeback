import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { writeAuditLog } from '@/lib/admin-audit';
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !allowAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 200);
    const userId = searchParams.get('user_id')?.trim() || null;

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ entries: [] });
    }

    let query = adminClient
      .from('points_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (userId) query = query.eq('user_id', userId);

    const { data: entries, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch ledger' },
        { status: 500 }
      );
    }

    type LedgerEntry = { user_id: string } & Record<string, unknown>;
    const safeEntries = (entries || []) as LedgerEntry[];
    const entriesWithEmails = await Promise.all(
      safeEntries.map(async (entry) => {
        const { data: authUser } = await adminClient.auth.admin.getUserById(entry.user_id);
        return {
          ...entry,
          email: authUser?.user?.email || 'Unknown',
        };
      })
    );

    return NextResponse.json({ entries: entriesWithEmails });
  } catch (error) {
    console.error('Admin ledger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !allowAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Admin client disabled. Set SUPABASE_SERVICE_ROLE_KEY for admin writes.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { userId, amount, type } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const amt = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (type !== 'credit' && type !== 'debit') {
      return NextResponse.json({ error: 'type must be credit or debit' }, { status: 400 });
    }

    const delta = type === 'credit' ? amt : -amt;
    const reason = type === 'credit' ? 'admin_credit' : 'admin_debit';

    const { error: insertError } = await adminClient
      .from('points_ledger')
      .insert({ user_id: userId, delta, reason, ref_type: 'admin', ref_id: null });

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create ledger entry' },
        { status: 500 }
      );
    }

    const actor = user.email || user.id;
    await writeAuditLog({
      actor,
      action: type === 'credit' ? 'credit_points' : 'debit_points',
      target_type: 'user',
      target_id: userId,
      payload: { amount: amt, reason },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin ledger POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
