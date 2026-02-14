import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/dev';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { canUserAct } from '@/lib/utils-server';

/**
 * POST /api/system-check/redeem — redeem cheapest active variant for current user (test only).
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
  const supabase = await createClient();

  const client = admin ?? supabase;

  const { data: variants, error: variantsError } = await client
    .from('reward_variants')
    .select('id, cost_points')
    .eq('is_active', true)
    .order('cost_points', { ascending: true })
    .limit(5);

  if (variantsError || !variants?.length) {
    return NextResponse.json(
      { error: 'No active variant found' },
      { status: 404 }
    );
  }

  const variant = variants[0];

  const idempotencyKey = crypto.randomUUID();

  const { data, error } = await supabase.rpc('redeem_reward', {
    p_variant_id: variant.id,
    p_idempotency_key: idempotencyKey,
    p_note: 'system_check',
  });

  if (error) {
    const err = error as { code?: string; message?: string; details?: string; hint?: string };
    console.error('Redeem RPC error:', { code: err.code, message: err.message, details: err.details, hint: err.hint });
    return NextResponse.json(
      { error: err.message ?? 'Redeem failed', code: err.code },
      { status: 500 }
    );
  }

  const raw = data as Record<string, unknown> | null;
  if (!raw?.success) {
    return NextResponse.json(
      { error: (raw?.error as string) ?? (raw?.message as string) ?? 'Redemption failed' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Çekim yapıldı: ${variant.id}, ${raw.cost_points ?? variant.cost_points} puan`,
  });
}
