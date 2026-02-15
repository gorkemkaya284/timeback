-- ============================================
-- C) RPC: can_redeem(user_id, variant_id, cost_points) -> {allowed, reason}
-- Rate limit: new user (<24h) max 1 redeem/day, max 50 TL (5000 pts)/day.
-- Level 1: 50 TL/day, Level 2: 150 TL/day, Level 3: 500 TL/day.
-- ============================================

CREATE OR REPLACE FUNCTION public.can_redeem(
  p_user_id UUID,
  p_variant_id UUID,
  p_cost_points INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_created TIMESTAMPTZ;
  v_level INT := 1;
  v_redeem_count_today INT;
  v_payout_today INT;
  v_max_payout_today INT;
  v_variant_payout INT;
  v_variant_daily_limit INT;
BEGIN
  -- Get variant payout and per_user_daily_limit
  SELECT rv.denomination_tl, COALESCE(rv.per_user_daily_limit, rv.daily_limit_per_user)
  INTO v_variant_payout, v_variant_daily_limit
  FROM tb_reward_variants rv
  WHERE rv.id = p_variant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'VARIANT_NOT_FOUND');
  END IF;

  -- User level from profiles or tb_user_profile
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'level') THEN
    SELECT p.created_at, COALESCE(p.level, 1) INTO v_profile_created, v_level
    FROM profiles p WHERE p.user_id = p_user_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tb_user_profile') THEN
    SELECT up.created_at, COALESCE(up.level, 1) INTO v_profile_created, v_level
    FROM tb_user_profile up WHERE up.user_id = p_user_id;
  ELSE
    SELECT created_at INTO v_profile_created FROM profiles WHERE user_id = p_user_id;
    v_level := 1;
  END IF;

  -- New user: < 24h
  IF v_profile_created IS NOT NULL AND (now() - v_profile_created) < interval '24 hours' THEN
    SELECT COUNT(*)::INT, COALESCE(SUM(r.payout_tl), 0)::INT INTO v_redeem_count_today, v_payout_today
    FROM tb_reward_redemptions r
    WHERE r.user_id = p_user_id
      AND r.created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul')
      AND r.status NOT IN ('rejected', 'canceled');
    IF v_redeem_count_today >= 1 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'NEW_USER_ONE_REDEEM_PER_DAY');
    END IF;
    IF v_payout_today + v_variant_payout > 50 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'NEW_USER_MAX_50_TL_PER_DAY');
    END IF;
  END IF;

  -- Level-based daily cap (TL)
  v_max_payout_today := CASE v_level
    WHEN 1 THEN 50
    WHEN 2 THEN 150
    WHEN 3 THEN 500
    ELSE 500
  END;

  SELECT COALESCE(SUM(r.payout_tl), 0)::INT INTO v_payout_today
  FROM tb_reward_redemptions r
  WHERE r.user_id = p_user_id
    AND r.created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul')
    AND r.status NOT IN ('rejected', 'canceled');

  IF v_payout_today + v_variant_payout > v_max_payout_today THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DAILY_LIMIT_EXCEEDED', 'max_tl', v_max_payout_today);
  END IF;

  -- Per-variant daily limit
  IF v_variant_daily_limit IS NOT NULL AND v_variant_daily_limit > 0 THEN
    SELECT COUNT(*)::INT INTO v_redeem_count_today
    FROM tb_reward_redemptions
    WHERE user_id = p_user_id AND variant_id = p_variant_id
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul')
      AND status NOT IN ('rejected', 'canceled');
    IF v_redeem_count_today >= v_variant_daily_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'DAILY_LIMIT_EXCEEDED');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', null);
END;
$$;
