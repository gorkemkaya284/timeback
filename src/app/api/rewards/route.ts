import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/rewards
 * Returns active rewards and variants using service role (no RLS).
 * Never exposes SUPABASE_SERVICE_ROLE_KEY to the client.
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

    const [rewardsRes, variantsRes] = await Promise.all([
      supabase
        .from('rewards')
        .select('id, title, provider, kind, image_url, is_active, sort_order, created_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('reward_variants')
        .select('id, reward_id, denomination_tl, cost_points, stock, daily_limit_per_user, min_account_age_days, is_active, created_at')
        .eq('is_active', true)
        .order('denomination_tl', { ascending: true }),
    ]);

    if (rewardsRes.error || variantsRes.error) {
      console.error('GET /api/rewards:', rewardsRes.error ?? variantsRes.error);
      return NextResponse.json(
        { rewards: [], variants: [], error: 'Fetch failed' },
        { status: 500 }
      );
    }

    const rewards = rewardsRes.data ?? [];
    const variants = variantsRes.data ?? [];

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
