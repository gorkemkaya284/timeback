-- ============================================
-- Timeback Rewards System v2
-- Schema: rewards + reward_variants + reward_redemptions + admin_actions
-- 1P = 0.01 TL => cost_points = denomination_tl * 100
-- ============================================

-- Drop old RPC (legacy signature: bigint, uuid)
DROP FUNCTION IF EXISTS public.redeem_reward(BIGINT, UUID);
DROP FUNCTION IF EXISTS public.redeem_reward(INTEGER, UUID);

-- Drop legacy tables (replaced by new schema)
DROP TABLE IF EXISTS public.redemptions CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;

-- ============================================
-- 1. rewards
-- ============================================
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  kind TEXT NOT NULL DEFAULT 'gift' CHECK (kind IN ('gift', 'bank_transfer')),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rewards_is_active ON public.rewards(is_active);
CREATE INDEX idx_rewards_sort_order ON public.rewards(sort_order);

-- ============================================
-- 2. reward_variants
-- ============================================
CREATE TABLE public.reward_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  denomination_tl INT NOT NULL CHECK (denomination_tl > 0),
  cost_points INT NOT NULL CHECK (cost_points > 0),
  stock INT,
  daily_limit_per_user INT,
  min_account_age_days INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reward_variants_reward_id ON public.reward_variants(reward_id);
CREATE INDEX idx_reward_variants_is_active ON public.reward_variants(is_active);
CREATE INDEX idx_reward_variants_denomination ON public.reward_variants(denomination_tl);

-- ============================================
-- 3. reward_redemptions
-- ============================================
CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_variant_id UUID NOT NULL REFERENCES public.reward_variants(id),
  cost_points INT NOT NULL CHECK (cost_points > 0),
  payout_tl INT NOT NULL CHECK (payout_tl > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'canceled')),
  idempotency_key TEXT NOT NULL,
  note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX idx_reward_redemptions_user_created ON public.reward_redemptions(user_id, created_at DESC);
CREATE INDEX idx_reward_redemptions_status_created ON public.reward_redemptions(status, created_at DESC);

-- ============================================
-- 4. admin_actions (audit)
-- ============================================
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_actor_created ON public.admin_actions(actor_id, created_at DESC);
CREATE INDEX idx_admin_actions_action_created ON public.admin_actions(action, created_at DESC);

-- ============================================
-- RLS: rewards
-- ============================================
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_select_active"
  ON public.rewards FOR SELECT
  USING (is_active = true);

-- Insert/Update/Delete via service role (no user policy)

-- ============================================
-- RLS: reward_variants
-- ============================================
ALTER TABLE public.reward_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_variants_select_active"
  ON public.reward_variants FOR SELECT
  USING (is_active = true);

-- ============================================
-- RLS: reward_redemptions
-- ============================================
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_redemptions_select_own"
  ON public.reward_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "reward_redemptions_insert_own"
  ON public.reward_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy for users (admin changes via service role only)

-- ============================================
-- RLS: admin_actions (admin only via service role)
-- ============================================
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- No policies: service role bypasses RLS

-- ============================================
-- Redeem RPC (atomik, idempotent)
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
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_USER', 'message', 'User not authenticated');
  END IF;

  -- Idempotency: existing redemption for this user + key
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

  -- Lock variant and get reward
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

  -- min_account_age_days
  IF v_variant.min_account_age_days IS NOT NULL AND v_variant.min_account_age_days > 0 THEN
    SELECT created_at INTO v_profile_created FROM profiles WHERE user_id = v_uid;
    IF v_profile_created IS NULL OR (now() - v_profile_created) < (v_variant.min_account_age_days || ' days')::INTERVAL THEN
      RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_TOO_NEW');
    END IF;
  END IF;

  -- daily_limit_per_user
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

  -- User points
  SELECT COALESCE(SUM(delta), 0)::INT INTO v_user_points
  FROM points_ledger WHERE user_id = v_uid;

  IF v_user_points < v_variant.cost_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_POINTS');
  END IF;

  -- Insert redemption (to get id for ledger ref)
  INSERT INTO reward_redemptions (user_id, reward_variant_id, cost_points, payout_tl, status, idempotency_key, note)
  VALUES (v_uid, p_variant_id, v_variant.cost_points, v_variant.denomination_tl, 'pending', p_idempotency_key, p_note)
  RETURNING id INTO v_redemption_id;

  -- Ledger debit (idempotent: ref_type+ref_id unique)
  -- Use ref_type='reward_redeem', ref_id=idempotency_key to prevent double ledger from retries
  INSERT INTO points_ledger (user_id, delta, type, reason, ref_type, ref_id)
  VALUES (
    v_uid,
    -v_variant.cost_points,
    'debit',
    'reward_redeem',
    'reward_redeem',
    p_idempotency_key
  );

  -- Decrease stock
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
    -- Idempotency: another concurrent insert (user_id, idempotency_key or ledger ref_type+ref_id)
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

-- ============================================
-- Seed: Başlangıç ödülleri
-- ============================================
INSERT INTO public.rewards (id, title, provider, kind, is_active, sort_order) VALUES
  (gen_random_uuid(), 'Timeback Dijital Ödül', 'manual', 'gift', true, 10),
  (gen_random_uuid(), 'Banka Havalesi', 'manual', 'bank_transfer', true, 20);

-- Gift variants: 50 TL (5000P), 100 TL (10000P)
INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, is_active)
SELECT id, 50, 5000, NULL, true FROM public.rewards WHERE kind = 'gift' AND title = 'Timeback Dijital Ödül' LIMIT 1;
INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, is_active)
SELECT id, 100, 10000, NULL, true FROM public.rewards WHERE kind = 'gift' AND title = 'Timeback Dijital Ödül' LIMIT 1;

-- Bank transfer variant: 300 TL (30000P), daily_limit=1, min_account_age_days=3
INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, daily_limit_per_user, min_account_age_days, is_active)
SELECT id, 300, 30000, NULL, 1, 3, true FROM public.rewards WHERE kind = 'bank_transfer' AND title = 'Banka Havalesi' LIMIT 1;
