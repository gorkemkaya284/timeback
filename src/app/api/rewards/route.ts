import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, reason: 'MISSING_SERVICE_ROLE' },
      { status: 500, headers: NO_STORE }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: rewards, error } = await supabase
    .from('tb_rewards')
    .select(
      `
      id,
      title,
      provider,
      kind,
      image_url,
      is_active,
      sort_order,
      created_at,
      tb_reward_variants (
        id,
        reward_id,
        denomination_tl,
        cost_points,
        stock,
        daily_limit_per_user,
        min_account_age_days,
        is_active,
        created_at
      )
    `
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    const msg = error.message ?? '';
    const useFallbackQueries = msg.includes('tb_reward_variants') || msg.includes('reward_variants') || msg.includes('relation') || (error as { code?: string }).code === '42703';
    if (useFallbackQueries) {
      const rRes1 = await supabase.from('tb_rewards').select('id, title, provider, kind, image_url, is_active, sort_order, created_at').eq('is_active', true).order('sort_order', { ascending: true });
      let rewardsData = rRes1.data ?? [];
      let rewardsError = rRes1.error;
      if (rewardsError && (rewardsError as { code?: string }).code === '42703') {
        const rRes2 = await supabase.from('tb_rewards').select('id, title, kind, image_url, is_active, sort_order, created_at').eq('is_active', true).order('sort_order', { ascending: true });
        rewardsData = (rRes2.data ?? []).map((r) => ({ ...r, provider: 'manual' }));
        rewardsError = rRes2.error;
      }
      const vRes = await supabase.from('tb_reward_variants').select('id, reward_id, denomination_tl, cost_points, stock, daily_limit_per_user, min_account_age_days, is_active, created_at').eq('is_active', true).order('denomination_tl', { ascending: true });
      if (rewardsError || vRes.error) {
        return NextResponse.json(
          { ok: false, reason: 'DB_ERROR', error: { code: rewardsError?.code ?? vRes.error?.code, message: rewardsError?.message ?? vRes.error?.message } },
          { status: 500, headers: NO_STORE }
        );
      }
      const rewardsList = rewardsData.map((r) => ({ ...r, provider: (r as { provider?: string }).provider ?? 'manual' }));
      const variantsList = (vRes.data ?? []).map((v) => ({
        id: v.id,
        reward_id: v.reward_id,
        denomination_tl: Number(v.denomination_tl),
        cost_points: Number(v.cost_points),
        stock: v.stock ?? null,
        daily_limit_per_user: v.daily_limit_per_user ?? null,
        min_account_age_days: v.min_account_age_days ?? null,
        is_active: v.is_active ?? true,
        created_at: v.created_at ?? new Date().toISOString(),
      }));
      const withNested = rewardsList.map((r) => ({ ...r, reward_variants: variantsList.filter((v) => v.reward_id === r.id) }));
      return NextResponse.json(
        { ok: true, source: 'db', rewardsCount: rewardsList.length, variantsCount: variantsList.length, rewards: withNested, variants: variantsList },
        { headers: NO_STORE }
      );
    }
    return NextResponse.json(
      { ok: false, reason: 'DB_ERROR', error: { code: error.code, message: error.message, details: error.details, hint: error.hint } },
      { status: 500, headers: NO_STORE }
    );
  }

  const rows = rewards ?? [];
  const activeRewards = rows.map((r) => {
    const row = r as typeof r & { tb_reward_variants?: Array<{ id: string; reward_id?: string; denomination_tl: number; cost_points: number; is_active?: boolean }> };
    const v = row.tb_reward_variants ?? [];
    const active = v.filter((x) => x.is_active !== false);
    return { ...r, reward_variants: active };
  });

  const flatVariants: Array<{
    id: string;
    reward_id: string;
    denomination_tl: number;
    cost_points: number;
    stock: number | null;
    daily_limit_per_user: number | null;
    min_account_age_days: number | null;
    is_active: boolean;
    created_at: string;
  }> = [];
  for (const r of activeRewards) {
    const list = (r as { reward_variants?: Array<Record<string, unknown>> }).reward_variants ?? [];
    for (const v of list) {
      flatVariants.push({
        id: String(v.id),
        reward_id: String(v.reward_id ?? r.id),
        denomination_tl: Number(v.denomination_tl),
        cost_points: Number(v.cost_points),
        stock: v.stock != null ? Number(v.stock) : null,
        daily_limit_per_user: v.daily_limit_per_user != null ? Number(v.daily_limit_per_user) : null,
        min_account_age_days: v.min_account_age_days != null ? Number(v.min_account_age_days) : null,
        is_active: v.is_active !== false,
        created_at: typeof v.created_at === 'string' ? v.created_at : new Date().toISOString(),
      });
    }
  }

  const rewardsCount = activeRewards.length;
  const variantsCount = flatVariants.length;

  return NextResponse.json(
    {
      ok: true,
      source: 'db',
      rewardsCount,
      variantsCount,
      rewards: activeRewards,
      variants: flatVariants,
    },
    { headers: NO_STORE }
  );
}
