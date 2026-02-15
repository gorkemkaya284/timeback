-- ============================================
-- redeem_reward: risk gate BEFORE ledger.
-- When recommended_action = 'block':
--   - tb_reward_redemptions row exists with status='rejected', note='risk_block'
--   - points_ledger DEBIT is NOT written (no reversal needed)
--   - RPC raises P0001 / RISK_BLOCK for frontend to log redeem_blocked
-- Idempotency and success flow unchanged.
-- ============================================

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
  v_ledger_ref_id TEXT;
  v_can JSONB;
  v_risk RECORD;
  v_last_redeem_at TIMESTAMPTZ;
  v_stock_val INT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_USER', 'message', 'User not authenticated');
  END IF;

  v_ledger_ref_id := 'redeem:' || p_idempotency_key;

  SELECT id, status, cost_points, payout_tl
  INTO v_existing_id, v_existing_status, v_existing_cost, v_existing_payout
  FROM tb_reward_redemptions
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
         rv.stock_remaining, rv.daily_limit_per_user, rv.per_user_daily_limit,
         rv.min_account_age_days, rv.is_active, rv.cooldown_seconds
  INTO v_variant
  FROM tb_reward_variants rv
  WHERE rv.id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VARIANT_NOT_FOUND');
  END IF;

  IF NOT v_variant.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'VARIANT_INACTIVE');
  END IF;

  v_stock_val := COALESCE(v_variant.stock_remaining, v_variant.stock);
  IF v_stock_val IS NOT NULL AND v_stock_val < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_STOCK');
  END IF;

  SELECT id, kind, is_active INTO v_reward FROM tb_rewards WHERE id = v_variant.reward_id;
  IF NOT FOUND OR NOT v_reward.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'REWARD_INACTIVE');
  END IF;

  v_can := can_redeem(v_uid, p_variant_id, v_variant.cost_points);
  IF (v_can->>'allowed')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'RATE_LIMIT', 'message', COALESCE(v_can->>'reason', 'Not allowed'));
  END IF;

  IF v_variant.cooldown_seconds IS NOT NULL AND v_variant.cooldown_seconds > 0 THEN
    SELECT MAX(created_at) INTO v_last_redeem_at
    FROM tb_reward_redemptions
    WHERE user_id = v_uid AND variant_id = p_variant_id AND status NOT IN ('rejected', 'canceled');
    IF v_last_redeem_at IS NOT NULL AND (now() - v_last_redeem_at) < (v_variant.cooldown_seconds || ' seconds')::interval THEN
      RETURN jsonb_build_object('success', false, 'error', 'COOLDOWN', 'message', 'Try again later');
    END IF;
  END IF;

  IF v_variant.min_account_age_days IS NOT NULL AND v_variant.min_account_age_days > 0 THEN
    SELECT created_at INTO v_profile_created FROM profiles WHERE user_id = v_uid;
    IF v_profile_created IS NULL OR (now() - v_profile_created) < (v_variant.min_account_age_days || ' days')::INTERVAL THEN
      RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_TOO_NEW');
    END IF;
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul');
  v_today_count := 0;
  IF COALESCE(v_variant.per_user_daily_limit, v_variant.daily_limit_per_user) IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_today_count
    FROM tb_reward_redemptions
    WHERE user_id = v_uid AND variant_id = p_variant_id
      AND created_at >= v_today_start
      AND status NOT IN ('rejected', 'canceled');
    IF v_today_count >= COALESCE(v_variant.per_user_daily_limit, v_variant.daily_limit_per_user) THEN
      RETURN jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_EXCEEDED');
    END IF;
  END IF;

  SELECT COALESCE(SUM(delta), 0)::INT INTO v_user_points FROM points_ledger WHERE user_id = v_uid;
  IF v_user_points < v_variant.cost_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_POINTS');
  END IF;

  -- 1) Create redemption row (pending) so assess_risk can resolve user_id from it
  INSERT INTO tb_reward_redemptions (user_id, variant_id, cost_points, payout_tl, status, idempotency_key, note)
  VALUES (v_uid, p_variant_id, v_variant.cost_points, v_variant.denomination_tl, 'pending', p_idempotency_key, p_note)
  RETURNING id INTO v_redemption_id;

  -- 2) Risk gate BEFORE any ledger write: block => no debit, no reversal
  v_risk := assess_risk('reward_redemption', v_redemption_id);
  IF v_risk.recommended_action = 'block' THEN
    UPDATE tb_reward_redemptions SET status = 'rejected', note = 'risk_block' WHERE id = v_redemption_id;
    RAISE EXCEPTION USING errcode = 'P0001', message = 'RISK_BLOCK';
  END IF;

  -- 3) Allow/review: write debit and decrement stock
  INSERT INTO points_ledger (user_id, delta, type, reason, ref_type, ref_id)
  VALUES (v_uid, -v_variant.cost_points, 'debit', 'reward_redeem', 'redeem', v_ledger_ref_id);

  IF v_variant.stock_remaining IS NOT NULL THEN
    UPDATE tb_reward_variants SET stock_remaining = stock_remaining - 1 WHERE id = p_variant_id;
  ELSIF v_variant.stock IS NOT NULL THEN
    UPDATE tb_reward_variants SET stock = stock - 1 WHERE id = p_variant_id;
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
    FROM tb_reward_redemptions
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
