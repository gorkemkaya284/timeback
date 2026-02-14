import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

/** Variant shape: id (UUID), denomination_tl, cost_points always present. */
type VariantRow = {
  id: string;
  reward_id: string;
  denomination_tl: number;
  cost_points: number;
  stock?: number | null;
  daily_limit_per_user?: number | null;
  min_account_age_days?: number | null;
  is_active?: boolean;
  created_at?: string;
};

/** Reward shape for UI. */
type RewardRow = {
  id: string;
  title: string;
  provider?: string;
  kind: string;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
};

/**
 * GET /api/rewards
 * Service role: rewards (is_active=true) + variants (is_active=true).
 * Each variant has id (UUID), denomination_tl, cost_points. Never exposes service role key.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { rewards: [], variants: [], error: 'Service unavailable' },
        { status: 503 }
      );
    }

    // Rewards: try with provider first; if column missing (42703), retry without provider
    const rewardsRes = await supabase
      .from('rewards')
      .select('id, title, provider, kind, image_url, is_active, sort_order, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    let rewardsList: RewardRow[];
    if (rewardsRes.error && (rewardsRes.error as { code?: string }).code === '42703') {
      const fallback = await supabase
        .from('rewards')
        .select('id, title, kind, image_url, is_active, sort_order, created_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (fallback.error || !fallback.data?.length) {
        console.error('GET /api/rewards:', rewardsRes.error ?? fallback.error);
        return NextResponse.json(
          { rewards: [], variants: [], error: 'Fetch failed' },
          { status: 500 }
        );
      }
      rewardsList = (fallback.data as RewardRow[]).map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        provider: 'manual',
        image_url: r.image_url ?? null,
        is_active: r.is_active ?? true,
        sort_order: r.sort_order ?? 0,
        created_at: r.created_at ?? new Date().toISOString(),
      }));
    } else if (rewardsRes.error) {
      console.error('GET /api/rewards:', rewardsRes.error);
      return NextResponse.json(
        { rewards: [], variants: [], error: 'Fetch failed' },
        { status: 500 }
      );
    } else {
      rewardsList = (rewardsRes.data ?? []).map((r) => ({
        ...r,
        provider: (r as RewardRow).provider ?? 'manual',
      }));
    }

    const variantsRes = await supabase
      .from('reward_variants')
      .select('id, reward_id, denomination_tl, cost_points, stock, daily_limit_per_user, min_account_age_days, is_active, created_at')
      .eq('is_active', true)
      .order('denomination_tl', { ascending: true });

    if (variantsRes.error) {
      console.error('GET /api/rewards:', variantsRes.error);
      return NextResponse.json(
        { rewards: [], variants: [], error: 'Fetch failed' },
        { status: 500 }
      );
    }

    const rewards: RewardRow[] = rewardsList;
    const variants: VariantRow[] = (variantsRes.data ?? []).map((v) => ({
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

    return NextResponse.json({
      rewards,
      variants,
    });
  } catch (err) {
    console.error('GET /api/rewards error:', err);
    return NextResponse.json(
      { rewards: [], variants: [], error: 'Server error' },
      { status: 500 }
    );
  }
}
