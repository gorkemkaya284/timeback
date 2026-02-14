import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Variant: id (UUID), denomination_tl, cost_points always present. */
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

/** Reward for UI. */
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

function errPayload(
  reason: string,
  hasServiceRole: boolean,
  error?: { code?: string; message?: string; details?: string; hint?: string }
) {
  return {
    ok: false as const,
    source: 'db' as const,
    reason,
    env: { hasServiceRole },
    error: error
      ? {
          code: error.code ?? null,
          message: error.message ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        }
      : undefined,
  };
}

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
};

/**
 * GET /api/rewards
 * Debug-friendly: ok, source, rewardsCount, variantsCount; on error reason + env + error.
 */
export async function GET() {
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!hasServiceRole) {
    return NextResponse.json(
      errPayload('MISSING_SERVICE_ROLE', false),
      { status: 500, headers: noStoreHeaders }
    );
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      errPayload('ADMIN_CLIENT_NULL', true),
      { status: 500, headers: noStoreHeaders }
    );
  }

  try {
    // Rewards: full columns first; if 42703 (column missing), retry without provider
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
      if (fallback.error) {
        const e = fallback.error as { code?: string; message?: string; details?: string; hint?: string };
        return NextResponse.json(
          errPayload('REWARDS_FETCH_FAILED', true, e),
          { status: 500, headers: noStoreHeaders }
        );
      }
      if (!fallback.data?.length) {
        return NextResponse.json(
          { ok: true, source: 'db', rewardsCount: 0, variantsCount: 0, rewards: [], variants: [] },
          { headers: noStoreHeaders }
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
      const e = rewardsRes.error as { code?: string; message?: string; details?: string; hint?: string };
      return NextResponse.json(
        errPayload('REWARDS_FETCH_FAILED', true, e),
        { status: 500, headers: noStoreHeaders }
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
      const e = variantsRes.error as { code?: string; message?: string; details?: string; hint?: string };
      return NextResponse.json(
        errPayload('VARIANTS_FETCH_FAILED', true, e),
        { status: 500, headers: noStoreHeaders }
      );
    }

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

    const rewardsCount = rewardsList.length;
    const variantsCount = variants.length;

    return NextResponse.json(
      {
        ok: true,
        source: 'db',
        rewardsCount,
        variantsCount,
        rewards: rewardsList,
        variants,
      },
      { headers: noStoreHeaders }
    );
  } catch (err) {
    const e = err instanceof Error ? err : { message: String(err), code: undefined, details: undefined, hint: undefined };
    return NextResponse.json(
      errPayload('SERVER_ERROR', true, {
        code: (e as { code?: string }).code,
        message: e.message,
        details: (e as { details?: string }).details,
        hint: (e as { hint?: string }).hint,
      }),
      { status: 500, headers: noStoreHeaders }
    );
  }
}
