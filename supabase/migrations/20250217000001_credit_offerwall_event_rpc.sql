-- RPC: credit_offerwall_event
-- Called from server with feature flags. Executes in a single transaction.

CREATE OR REPLACE FUNCTION public.credit_offerwall_event(
  p_event_id UUID,
  p_credit_enabled BOOLEAN,
  p_test_allowlist TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_user_tl NUMERIC;
  v_user_points INTEGER;
  v_reason TEXT;
BEGIN
  -- 1) Fetch and lock event row
  SELECT id, provider, user_id, status, payout_tl, reward_points, credited_at
  INTO v_event
  FROM public.offerwall_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- 2) Idempotent: already credited
  IF v_event.credited_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'skipped', 'already_credited');
  END IF;

  -- 3) Status must be approved
  IF v_event.status IS NULL OR LOWER(TRIM(v_event.status)) NOT IN ('approved', 'completed', 'success') THEN
    RETURN jsonb_build_object('success', false, 'skipped', 'status_not_approved', 'status', v_event.status);
  END IF;

  -- 4) user_id required
  IF v_event.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event has no user_id');
  END IF;

  -- 5) Feature flag: credit disabled and user not in allowlist
  IF NOT p_credit_enabled THEN
    IF NOT (v_event.user_id::TEXT = ANY(p_test_allowlist)) THEN
      RETURN jsonb_build_object('success', true, 'skipped', 'credit_disabled_user_not_allowlisted');
    END IF;
  END IF;

  -- 6) Determine payout_tl (prefer column, else reward_points/100)
  IF v_event.payout_tl IS NOT NULL AND v_event.payout_tl > 0 THEN
    v_user_tl := GREATEST(v_event.payout_tl * 0.7, v_event.payout_tl - 2);
  ELSIF v_event.reward_points IS NOT NULL AND v_event.reward_points > 0 THEN
    v_user_tl := GREATEST((v_event.reward_points::NUMERIC / 100) * 0.7, (v_event.reward_points::NUMERIC / 100) - 2);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'No payout_tl or reward_points');
  END IF;

  v_user_points := FLOOR(v_user_tl / 0.01)::INTEGER;

  IF v_user_points <= 0 THEN
    RETURN jsonb_build_object('success', false, 'skipped', 'points_le_zero', 'user_tl', v_user_tl);
  END IF;

  -- 7) Insert ledger credit (idempotent: unique on ref_type, ref_id)
  -- ref_type = source (provider), ref_id = source_event_id (offerwall_events.id)
  v_reason := 'Offerwall: ' || v_event.provider || ' (event ' || p_event_id::TEXT || ')';

  BEGIN
    INSERT INTO public.points_ledger (user_id, delta, reason, ref_type, ref_id)
    VALUES (v_event.user_id, v_user_points, v_reason, v_event.provider, p_event_id::TEXT);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', true, 'skipped', 'already_credited');
  END;

  -- 8) Mark credited
  UPDATE public.offerwall_events
  SET credited_at = NOW()
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'credited', true,
    'user_id', v_event.user_id,
    'points', v_user_points,
    'provider', v_event.provider
  );
END;
$$;
