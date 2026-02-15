-- ============================================
-- B) RPC: assess_risk(entity_type, entity_id) -> tb_risk_assessments row
-- Security definer; returns inserted row (recommended_action, risk_score, flags, details).
-- ============================================

CREATE OR REPLACE FUNCTION public.assess_risk(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS public.tb_risk_assessments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ev_created_at TIMESTAMPTZ;
  v_ip INET;
  v_fingerprint TEXT;
  v_score INT := 0;
  v_flags TEXT[] := '{}';
  v_details JSONB := '{}'::jsonb;
  v_action TEXT := 'allow';
  v_rec RECORD;
  v_count INT;
  v_click_at TIMESTAMPTZ;
  v_prev_ip INET;
  v_prev_country TEXT;
BEGIN
  -- Resolve user_id and context by entity_type
  IF p_entity_type = 'offerwall_event' THEN
    SELECT user_id, created_at INTO v_user_id, v_ev_created_at
    FROM offerwall_events WHERE id = p_entity_id;
  ELSIF p_entity_type = 'reward_redemption' THEN
    SELECT user_id, created_at INTO v_user_id, v_ev_created_at
    FROM tb_reward_redemptions WHERE id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'Invalid entity_type: %', p_entity_type;
  END IF;

  IF v_user_id IS NULL THEN
    INSERT INTO tb_risk_assessments (entity_type, entity_id, user_id, risk_score, flags, recommended_action, details)
    VALUES (p_entity_type, p_entity_id, COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid), 0, '{}', 'allow', '{"reason":"no_user"}'::jsonb)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
      risk_score = 0, flags = '{}', recommended_action = 'allow', details = tb_risk_assessments.details || '{"reason":"no_user"}'::jsonb
    RETURNING * INTO v_rec;
    RETURN v_rec;
  END IF;

  -- R1: Too fast - offerwall_click to offerwall_event < 30s
  IF p_entity_type = 'offerwall_event' AND v_ev_created_at IS NOT NULL THEN
    SELECT MAX(created_at) INTO v_click_at
    FROM tb_security_events
    WHERE user_id = v_user_id AND event_type = 'offerwall_click' AND created_at <= v_ev_created_at;
    IF v_click_at IS NOT NULL AND (v_ev_created_at - v_click_at) < interval '30 seconds' THEN
      v_score := v_score + 30;
      v_flags := array_append(v_flags, 'too_fast');
      v_details := v_details || jsonb_build_object('r1_click_at', v_click_at, 'r1_ev_at', v_ev_created_at);
    END IF;
  END IF;

  -- R2: Burst - 10 min içinde >=5 offerwall_credited veya redeem_attempt
  SELECT COUNT(*)::INT INTO v_count
  FROM tb_security_events
  WHERE user_id = v_user_id
    AND event_type IN ('offerwall_credited', 'redeem_attempt')
    AND created_at >= now() - interval '10 minutes';
  IF v_count >= 5 THEN
    v_score := v_score + 25;
    v_flags := array_append(v_flags, 'burst');
    v_details := v_details || jsonb_build_object('r2_count_10m', v_count);
  END IF;

  -- R3: Multi-account - 24h aynı ip veya fingerprint ile >=3 farklı user
  SELECT ip, device_fingerprint INTO v_ip, v_fingerprint
  FROM tb_security_events
  WHERE user_id = v_user_id AND created_at >= now() - interval '24 hours'
  ORDER BY created_at DESC LIMIT 1;
  IF v_ip IS NOT NULL THEN
    SELECT COUNT(DISTINCT user_id)::INT INTO v_count
    FROM tb_security_events
    WHERE ip = v_ip AND created_at >= now() - interval '24 hours'
      AND event_type IN ('offerwall_credited', 'redeem_success', 'redeem_attempt');
    IF v_count >= 3 THEN
      v_score := v_score + 35;
      v_flags := array_append(v_flags, 'multi_account');
      v_details := v_details || jsonb_build_object('r3_same_ip_users', v_count);
    END IF;
  END IF;
  IF v_fingerprint IS NOT NULL AND NOT ('multi_account' = ANY(v_flags)) THEN
    SELECT COUNT(DISTINCT user_id)::INT INTO v_count
    FROM tb_security_events
    WHERE device_fingerprint = v_fingerprint AND created_at >= now() - interval '24 hours'
      AND event_type IN ('offerwall_credited', 'redeem_success', 'redeem_attempt');
    IF v_count >= 3 THEN
      v_score := v_score + 35;
      v_flags := array_append(v_flags, 'multi_account');
      v_details := v_details || jsonb_build_object('r3_same_fp_users', v_count);
    END IF;
  END IF;

  -- R4: IP/Country jump - 15 min içinde değişim (simplified: last 2 events different ip)
  SELECT ip, country INTO v_prev_ip, v_prev_country
  FROM tb_security_events
  WHERE user_id = v_user_id AND created_at < now() - interval '15 minutes'
  ORDER BY created_at DESC LIMIT 1;
  IF v_prev_ip IS NOT NULL AND v_ip IS NOT NULL AND v_prev_ip IS DISTINCT FROM v_ip THEN
    v_score := v_score + 15;
    v_flags := array_append(v_flags, 'ip_jump');
    v_details := v_details || jsonb_build_object('r4_prev_ip', v_prev_ip::text, 'r4_curr_ip', v_ip::text);
  END IF;

  -- R5: invalid_source - from metadata (app sets this when signature fails)
  -- We check entity metadata if available; for offerwall_events we could check raw_payload. For MVP skip in DB or pass via details later.
  -- So we don't add R5 in this migration; app can insert assessment with invalid_source flag when needed.

  -- Cap score at 100
  v_score := LEAST(v_score, 100);

  -- recommended_action
  IF v_score >= 70 THEN
    v_action := 'block';
  ELSIF v_score >= 30 THEN
    v_action := 'review';
  ELSE
    v_action := 'allow';
  END IF;

  INSERT INTO tb_risk_assessments (entity_type, entity_id, user_id, risk_score, flags, recommended_action, details)
  VALUES (p_entity_type, p_entity_id, v_user_id, v_score, v_flags, v_action, v_details)
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    risk_score = EXCLUDED.risk_score,
    flags = EXCLUDED.flags,
    recommended_action = EXCLUDED.recommended_action,
    details = EXCLUDED.details
  RETURNING * INTO v_rec;
  RETURN v_rec;
END;
$$;
