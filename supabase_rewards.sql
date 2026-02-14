-- Timeback STEP B: Rewards + Redemptions
-- Run in Supabase SQL Editor (after profiles + points_ledger exist)

-- ============================================
-- REWARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rewards (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- ============================================
-- REDEMPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.redemptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reward_id BIGINT NOT NULL REFERENCES public.rewards(id),
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON public.redemptions(user_id);

-- ============================================
-- ATOMIC REDEEM (single transaction, no double spend)
-- ============================================
CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id BIGINT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward RECORD;
  v_user_points INTEGER;
  v_redemption_id BIGINT;
  v_new_points INTEGER;
BEGIN
  -- 1) Lock reward row
  SELECT id, title, points_cost, stock, status
  INTO v_reward
  FROM public.rewards
  WHERE id = p_reward_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward not found');
  END IF;

  IF v_reward.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward is not active');
  END IF;

  IF v_reward.stock < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward out of stock');
  END IF;

  -- 2) User points from ledger (single source of truth)
  SELECT COALESCE(SUM(delta), 0)
  INTO v_user_points
  FROM public.points_ledger
  WHERE user_id = p_user_id;

  IF v_user_points < v_reward.points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  -- 3) Insert redemption
  INSERT INTO public.redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, 'pending')
  RETURNING id INTO v_redemption_id;

  -- 4) Ledger entry (deduct points)
  INSERT INTO public.points_ledger (user_id, delta, reason, ref_type, ref_id)
  VALUES (p_user_id, -v_reward.points_cost, 'Redeemed: ' || v_reward.title, 'redemption', v_redemption_id::TEXT);

  -- 5) Decrease stock
  UPDATE public.rewards
  SET stock = stock - 1
  WHERE id = p_reward_id;

  v_new_points := v_user_points - v_reward.points_cost;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'points_spent', v_reward.points_cost,
    'new_points', v_new_points,
    'reward_title', v_reward.title
  );
END;
$$;
