-- Ensure redeem_reward exists with exact signature:
-- redeem_reward(p_variant_id uuid, p_idempotency_key text, p_note text default null)
-- Run: supabase db push
-- Then: Supabase Dashboard > Settings > API > Reload schema cache

DROP FUNCTION IF EXISTS public.redeem_reward(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.redeem_reward(BIGINT, UUID);
DROP FUNCTION IF EXISTS public.redeem_reward(INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_variant_id UUID,
  p_idempotency_key TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_variant RECORD;
  v_reward RECORD;
  v_user_points INT;
  v_redemption_id UUID;
  v_existing_id UUID;
  v_existing_status TEXT;
  v_existing_cost INT;
  v_existing_payout INT;
  v_today_start TIMESTAMPTZ;
  v_today_count INT;
  v_profile_created TIMESTAMPTZ;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_USER', 'message', 'User not authenticated');
  END IF;

  SELECT id, status, cost_points, payout_tl
  INTO v_existing_id, v_existing_status, v_existing_cost, v_existing_payout
  FROM reward_redemptions
  WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true,
      'redemption_id', v_existing_id,
      'status', v_existing_status,
      'cost_points', v_existing_cost,
      'payout_tl', v_existing_payout
    );
  END IF;

  SELECT rv.id, rv.reward_id, rv.denomination_tl, rv.cost_points, rv.stock,
         rv.daily_limit_per_user, rv.min_account_age_days, rv.is_active,
         r.id as r_id, r.kind
  INTO v_variant
  FROM reward_variants rv
  JOIN rewards r ON r.id = rv.reward_id
  WHERE rv.id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VARIANT_NOT_FOUND');
  END IF;

  IF NOT v_variant.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'VARIANT_INACTIVE');
  END IF;

  SELECT id, kind, is_active INTO v_reward FROM rewards WHERE id = v_variant.reward_id;
  IF NOT v_reward.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'REWARD_INACTIVE');
  END IF;

  IF v_variant.stock IS NOT NULL AND v_variant.stock < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_STOCK');
  END IF;

  IF v_variant.min_account_age_days IS NOT NULL AND v_variant.min_account_age_days > 0 THEN
    SELECT created_at INTO v_profile_created FROM profiles WHERE user_id = v_uid;
    IF v_profile_created IS NULL OR (now() - v_profile_created) < (v_variant.min_account_age_days || ' days')::INTERVAL THEN
      RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_TOO_NEW');
    END IF;
  END IF;

  IF v_variant.daily_limit_per_user IS NOT NULL AND v_variant.daily_limit_per_user > 0 THEN
    v_today_start := date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul');
    SELECT COUNT(*)::INT INTO v_today_count
    FROM reward_redemptions
    WHERE user_id = v_uid AND reward_variant_id = p_variant_id
      AND created_at >= v_today_start
      AND status NOT IN ('rejected', 'canceled');
    IF v_today_count >= v_variant.daily_limit_per_user THEN
      RETURN jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_EXCEEDED');
    END IF;
  END IF;

  SELECT COALESCE(SUM(delta), 0)::INT INTO v_user_points
  FROM points_ledger WHERE user_id = v_uid;

  IF v_user_points < v_variant.cost_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_POINTS');
  END IF;

  INSERT INTO reward_redemptions (user_id, reward_variant_id, cost_points, payout_tl, status, idempotency_key, note)
  VALUES (v_uid, p_variant_id, v_variant.cost_points, v_variant.denomination_tl, 'pending', p_idempotency_key, p_note)
  RETURNING id INTO v_redemption_id;

  INSERT INTO points_ledger (user_id, delta, type, reason, ref_type, ref_id)
  VALUES (
    v_uid,
    -v_variant.cost_points,
    'debit',
    'reward_redeem',
    'reward_redeem',
    p_idempotency_key
  );

  IF v_variant.stock IS NOT NULL THEN
    UPDATE reward_variants SET stock = stock - 1 WHERE id = p_variant_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'status', 'pending',
    'cost_points', v_variant.cost_points,
    'payout_tl', v_variant.denomination_tl
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT id, status, cost_points, payout_tl
    INTO v_existing_id, v_existing_status, v_existing_cost, v_existing_payout
    FROM reward_redemptions
    WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true, 'idempotent', true,
        'redemption_id', v_existing_id,
        'status', v_existing_status,
        'cost_points', v_existing_cost,
        'payout_tl', v_existing_payout
      );
    END IF;
    RAISE;
END;
$$;
