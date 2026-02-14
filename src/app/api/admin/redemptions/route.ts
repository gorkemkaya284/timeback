import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/dev';
import { allowAdminAccess } from '@/lib/utils-server';
import { writeAuditLog } from '@/lib/admin-audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !allowAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ redemptions: [] });
    }

    const { data, error } = await adminClient
      .from('redemptions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch redemptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ redemptions: data || [] });
  } catch (error) {
    console.error('Admin redemptions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const { redemptionId, status, adminNote } = body;

    if (!redemptionId) {
      return NextResponse.json({ error: 'redemptionId required' }, { status: 400 });
    }
    if (status !== 'fulfilled' && status !== 'rejected') {
      return NextResponse.json({ error: 'status must be fulfilled or rejected' }, { status: 400 });
    }

    const updatePayload: { status: 'fulfilled' | 'rejected'; admin_note?: string } = {
      status: status as 'fulfilled' | 'rejected',
    };
    if (typeof adminNote === 'string' && adminNote.trim()) {
      updatePayload.admin_note = adminNote.trim();
    }

    const { data: row, error: updateError } = await adminClient
      .from('redemptions')
      .update(updatePayload)
      .eq('id', redemptionId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError || !row) {
      return NextResponse.json(
        { error: 'Redemption not found or already processed' },
        { status: 400 }
      );
    }

    const actor = user.email || user.id;
    const r = row as { user_id: string; reward_id: string; points_spent: number };
    await writeAuditLog({
      actor,
      action: status === 'fulfilled' ? 'redemption_fulfilled' : 'redemption_rejected',
      target_type: 'redemption',
      target_id: String(redemptionId),
      payload: { user_id: r.user_id, reward_id: r.reward_id, points_spent: r.points_spent },
    });

    // TODO: If rejected, optionally refund points (insert ledger +delta)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin redemptions PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
