import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

type Variant = {
  id: string;
  reward_id: string;
  denomination_tl: number;
  cost_points: number;
  stock: number | null;
  daily_limit_per_user: number | null;
  min_account_age_days: number | null;
  is_active: boolean;
  created_at: string;
};

type Reward = {
  id: string;
  title: string;
  kind: string;
  provider: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  variants: Variant[];
};

function normVariant(v: Record<string, unknown>, rewardId: string): Variant {
  return {
    id: String(v.id),
    reward_id: String(v.reward_id ?? rewardId),
    denomination_tl: Number(v.denomination_tl),
    cost_points: Number(v.cost_points),
    stock: v.stock != null ? Number(v.stock) : null,
    daily_limit_per_user: v.daily_limit_per_user != null ? Number(v.daily_limit_per_user) : null,
    min_account_age_days: v.min_account_age_days != null ? Number(v.min_account_age_days) : null,
    is_active: v.is_active !== false,
    created_at: typeof v.created_at === 'string' ? v.created_at : new Date().toISOString(),
  };
}

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

  const { data: rewardsRows, error } = await supabase
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
    const useFallback = msg.includes('tb_reward_variants') || msg.includes('relation') || (error as { code?: string }).code === '42703';
    if (useFallback) {
      const [rRes, vRes] = await Promise.all([
        supabase.from('tb_rewards').select('id, title, provider, kind, image_url, is_active, sort_order, created_at').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('tb_reward_variants').select('id, reward_id, denomination_tl, cost_points, stock, daily_limit_per_user, min_account_age_days, is_active, created_at').eq('is_active', true).order('denomination_tl', { ascending: true }),
      ]);
      if (rRes.error || vRes.error) {
        return NextResponse.json(
          { ok: false, reason: 'DB_ERROR', error: { code: rRes.error?.code ?? vRes.error?.code, message: rRes.error?.message ?? vRes.error?.message } },
          { status: 500, headers: NO_STORE }
        );
      }
      const rewardsData = (rRes.data ?? []).map((r) => ({ ...r, provider: (r as { provider?: string }).provider ?? 'manual' }));
      const variantsData = vRes.data ?? [];
      const rewards: Reward[] = rewardsData.map((r) => ({
        id: r.id,
        title: r.title,
        kind: (r as { kind?: string }).kind ?? 'gift',
        provider: (r as { provider?: string }).provider ?? 'manual',
        image_url: (r as { image_url?: string | null }).image_url ?? null,
        is_active: (r as { is_active?: boolean }).is_active ?? true,
        sort_order: (r as { sort_order?: number }).sort_order ?? 0,
        variants: variantsData
          .filter((v) => v.reward_id === r.id)
          .map((v) => normVariant(v as Record<string, unknown>, r.id)),
      }));
      return NextResponse.json(
        { ok: true, rewards: rewards.filter((r) => r.variants.length > 0) },
        { headers: NO_STORE }
      );
    }
    return NextResponse.json(
      { ok: false, reason: 'DB_ERROR', error: { code: error.code, message: error.message, details: error.details, hint: error.hint } },
      { status: 500, headers: NO_STORE }
    );
  }

  const rewards: Reward[] = (rewardsRows ?? []).map((r) => {
    const row = r as typeof r & { tb_reward_variants?: Record<string, unknown>[] };
    const rawVariants = row.tb_reward_variants ?? [];
    const variants = rawVariants
      .filter((v) => (v as { is_active?: boolean }).is_active !== false)
      .map((v) => normVariant(v as Record<string, unknown>, r.id));
    return {
      id: r.id,
      title: r.title,
      kind: (r as { kind?: string }).kind ?? 'gift',
      provider: (r as { provider?: string }).provider ?? 'manual',
      image_url: (r as { image_url?: string | null }).image_url ?? null,
      is_active: (r as { is_active?: boolean }).is_active ?? true,
      sort_order: (r as { sort_order?: number }).sort_order ?? 0,
      variants,
    };
  });

  return NextResponse.json(
    { ok: true, rewards: rewards.filter((r) => r.variants.length > 0) },
    { headers: NO_STORE }
  );
}
