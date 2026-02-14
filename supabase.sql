-- Timeback MVP Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1) PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  risk_score INTEGER NOT NULL DEFAULT 0,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- 2) POINTS LEDGER TABLE
-- ============================================
-- Single source of truth for all point transactions
-- Points are NEVER stored in profiles - always calculated from this ledger
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_id ON public.points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_created_at ON public.points_ledger(created_at DESC);

-- ============================================
-- POINTS TOTAL (single source of truth)
-- ============================================
-- Total points are NEVER stored; always computed from ledger.
-- Use this function for consistent SUM(delta) in one place.
CREATE OR REPLACE FUNCTION public.get_user_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(delta), 0)::INTEGER
  FROM public.points_ledger
  WHERE user_id = p_user_id;
$$;

-- ============================================
-- 3) REWARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rewards (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- ============================================
-- 4) REDEMPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.redemptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reward_id BIGINT NOT NULL REFERENCES public.rewards(id),
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user redemptions queries
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON public.redemptions(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Profiles: user can read own
-- CREATE POLICY "Users can view own profile"
--   ON public.profiles FOR SELECT
--   USING (auth.uid() = user_id);

-- Points ledger: user can read own
-- CREATE POLICY "Users can view own ledger"
--   ON public.points_ledger FOR SELECT
--   USING (auth.uid() = user_id);

-- Rewards: any authed user can read
-- CREATE POLICY "Authed users can view active rewards"
--   ON public.rewards FOR SELECT
--   USING (auth.role() = 'authenticated');

-- Redemptions: user can read own; inserts happen via server route
-- CREATE POLICY "Users can view own redemptions"
--   ON public.redemptions FOR SELECT
--   USING (auth.uid() = user_id);

-- ============================================
-- ATOMIC REDEEM FUNCTION
-- ============================================
-- This function performs redemption atomically to prevent double-spending
CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id BIGINT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward RECORD;
  v_user_points INTEGER;
  v_redemption_id BIGINT;
BEGIN
  -- Step 1: Fetch reward with row lock to prevent concurrent modifications
  SELECT id, title, points_cost, stock, status
  INTO v_reward
  FROM public.rewards
  WHERE id = p_reward_id
  FOR UPDATE;

  -- Check reward exists and is active
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward not found');
  END IF;

  IF v_reward.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward is not active');
  END IF;

  -- Step 2: Compute user points from ledger
  SELECT COALESCE(SUM(delta), 0)
  INTO v_user_points
  FROM public.points_ledger
  WHERE user_id = p_user_id;

  -- Step 3: Validate user has enough points and stock available
  IF v_user_points < v_reward.points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  IF v_reward.stock < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward out of stock');
  END IF;

  -- Step 4: Insert redemption record
  INSERT INTO public.redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, 'pending')
  RETURNING id INTO v_redemption_id;

  -- Step 5: Insert points ledger entry (deduct points)
  INSERT INTO public.points_ledger (user_id, delta, reason, ref_type, ref_id)
  VALUES (p_user_id, -v_reward.points_cost, 'Redeemed: ' || v_reward.title, 'redemption', v_redemption_id::TEXT);

  -- Step 6: Decrement stock
  UPDATE public.rewards
  SET stock = stock - 1
  WHERE id = p_reward_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'points_spent', v_reward.points_cost,
    'new_points', v_user_points - v_reward.points_cost,
    'reward_title', v_reward.title
  );
END;
$$;
