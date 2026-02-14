import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/admin-audit';

const DEV_MODE = process.env.DEV_MODE === 'true' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED', message: authError?.message ?? 'No session' }, { status: 401 });
    }

    const adminClient = getAdminClient();
    const clientForAdminCheck = adminClient ?? supabase;
    const { data: adminRow } = await clientForAdminCheck
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const isAdmin = DEV_MODE || !!adminRow;
    if (!isAdmin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Not an admin' }, { status: 403 });
    }

    if (!adminClient) {
      return NextResponse.json({
        users: [],
        warning: 'SUPABASE_SERVICE_ROLE_KEY not set. Profiles cannot be read.',
      });
    }

    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('user_id, email, risk_score, is_banned, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (profilesError) {
      return NextResponse.json(
        { error: 'INTERNAL', message: profilesError.message, details: 'profiles fetch' },
        { status: 500 }
      );
    }

    let warning: string | undefined;
    if (!profiles?.length) {
      const { data: authList } = await adminClient.auth.admin.listUsers({ perPage: 1 });
      if (authList?.users?.length) {
        warning = 'profiles table is empty; profile upsert is not running. Visit /app/dashboard once while logged in.';
      }
    }

    const pointsMap = new Map<string, { total_points: number; last_activity: string | null }>();

    const { data: pointsRows, error: pointsError } = await adminClient.rpc('get_all_users_points');
    type PointsRow = { user_id: string; total_points: number | string; last_activity: string | null };
    if (!pointsError && Array.isArray(pointsRows)) {
      (pointsRows as PointsRow[]).forEach((row) => {
        const total = typeof row.total_points === 'string' ? parseInt(row.total_points, 10) : Number(row.total_points);
        pointsMap.set(row.user_id, {
          total_points: isNaN(total) ? 0 : total,
          last_activity: row.last_activity ?? null,
        });
      });
    } else {
      const { data: ledgerRows } = await adminClient
        .from('points_ledger')
        .select('user_id, delta, created_at');

      if (ledgerRows?.length) {
        const agg = new Map<string, { sum: number; max: string | null }>();
        ledgerRows.forEach((r: { user_id: string; delta: number; created_at: string }) => {
          const cur = agg.get(r.user_id) ?? { sum: 0, max: null };
          cur.sum += r.delta;
          if (!cur.max || r.created_at > cur.max) cur.max = r.created_at;
          agg.set(r.user_id, cur);
        });
        agg.forEach((v, uid) => pointsMap.set(uid, { total_points: v.sum, last_activity: v.max }));
      }
    }

    type ProfileRow = { user_id: string; email?: string | null; risk_score: number; is_banned: boolean; created_at: string };
    const users = ((profiles ?? []) as ProfileRow[]).map((profile) => {
      const points = pointsMap.get(profile.user_id) ?? { total_points: 0, last_activity: null };
      return {
        ...profile,
        email: profile.email ?? 'Unknown',
        total_points: points.total_points,
        last_activity: points.last_activity,
      };
    });

    return NextResponse.json({ users, ...(warning && { warning }) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = process.env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined;
    console.error('Admin users GET error:', err);
    return NextResponse.json(
      { error: 'INTERNAL', message, ...(stack && { stack }) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED', message: authError?.message ?? 'No session' }, { status: 401 });
    }

    const adminClient = getAdminClient();
    const clientForAdminCheck = adminClient ?? supabase;
    const { data: adminRow } = await clientForAdminCheck
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const isAdmin = DEV_MODE || !!adminRow;
    if (!isAdmin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Not an admin' }, { status: 403 });
    }

    if (!adminClient) {
      return NextResponse.json(
        { error: 'SERVICE_UNAVAILABLE', message: 'SUPABASE_SERVICE_ROLE_KEY not set.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { userId, isBanned, riskScore } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'User ID required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof isBanned === 'boolean') {
      updateData.is_banned = isBanned;
    }
    if (typeof riskScore === 'number') {
      updateData.risk_score = Math.max(0, Math.min(100, riskScore));
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Provide isBanned or riskScore' },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { error: 'INTERNAL', message: error.message, details: 'profile update' },
        { status: 500 }
      );
    }

    const actor = user.email ?? user.id;
    if (typeof isBanned === 'boolean') {
      await writeAuditLog({
        actor,
        action: isBanned ? 'ban_user' : 'unban_user',
        target_type: 'profile',
        target_id: userId,
        payload: { isBanned },
      });
    }
    if (typeof riskScore === 'number') {
      await writeAuditLog({
        actor,
        action: 'adjust_risk_score',
        target_type: 'profile',
        target_id: userId,
        payload: { riskScore: Math.max(0, Math.min(100, riskScore)) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = process.env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined;
    console.error('Admin users PATCH error:', err);
    return NextResponse.json(
      { error: 'INTERNAL', message, ...(stack && { stack }) },
      { status: 500 }
    );
  }
}
