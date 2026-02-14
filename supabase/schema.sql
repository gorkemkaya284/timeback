-- Timeback Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- User profiles with risk scoring and ban status
-- Note: Total points are NEVER stored here - always calculated from points_ledger
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for risk score queries
CREATE INDEX idx_profiles_risk_score ON profiles(risk_score);
CREATE INDEX idx_profiles_is_banned ON profiles(is_banned);

-- ============================================
-- DEVICES TABLE
-- ============================================
-- Track devices and IPs for fraud detection
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_hash, ip_hash)
);

-- Indexes for device tracking
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_device_hash ON devices(device_hash);
CREATE INDEX idx_devices_ip_hash ON devices(ip_hash);

-- ============================================
-- POINTS LEDGER TABLE
-- ============================================
-- Single source of truth for all point transactions
-- Points are NEVER stored in profiles - always calculated from this ledger
CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL, -- Positive for earned, negative for spent
  reason TEXT NOT NULL, -- Human-readable reason (e.g., "Task completion", "Reward redemption")
  ref_type TEXT, -- Type of reference: 'redemption', 'offer_completion', 'referral', etc.
  ref_id UUID, -- Reference to the related record (redemption_id, offer_completion_id, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ledger queries
CREATE INDEX idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX idx_points_ledger_user_created ON points_ledger(user_id, created_at DESC);
CREATE INDEX idx_points_ledger_ref ON points_ledger(ref_type, ref_id);

-- ============================================
-- REWARDS TABLE
-- ============================================
-- Available rewards that users can redeem
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active rewards queries
CREATE INDEX idx_rewards_status ON rewards(status);
CREATE INDEX idx_rewards_points_cost ON rewards(points_cost);

-- ============================================
-- REDEMPTIONS TABLE
-- ============================================
-- Records of reward redemptions
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for redemption queries
CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_redemptions_created ON redemptions(created_at DESC);

-- ============================================
-- OFFER COMPLETIONS TABLE
-- ============================================
-- Records of completed offers from partners
-- event_id must be unique per provider to prevent duplicate rewards
CREATE TABLE offer_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL, -- e.g., 'tapjoy', 'fyber', 'adgem'
  event_id TEXT NOT NULL, -- Unique event ID from provider
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_points INTEGER NOT NULL CHECK (reward_points > 0),
  raw_payload JSONB, -- Store full provider payload for auditing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, event_id) -- Prevent duplicate rewards
);

-- Indexes for offer completion queries
CREATE INDEX idx_offer_completions_user_id ON offer_completions(user_id);
CREATE INDEX idx_offer_completions_provider ON offer_completions(provider);
CREATE INDEX idx_offer_completions_event_id ON offer_completions(event_id);

-- ============================================
-- REFERRALS TABLE
-- ============================================
-- Track referral relationships and bonuses
CREATE TABLE referrals (
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (referrer_user_id, referred_user_id)
);

-- Index for referral queries
CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Note: These are basic drafts. Review and adjust based on your security requirements.

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- PROFILES: Service role can manage all profiles (for admin)
-- Note: Admin operations should use service role key, not these policies

-- DEVICES: Users can view their own device records
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  USING (auth.uid() = user_id);

-- POINTS_LEDGER: Users can view their own ledger entries
CREATE POLICY "Users can view own ledger"
  ON points_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- REWARDS: Everyone can view active rewards
CREATE POLICY "Anyone can view active rewards"
  ON rewards FOR SELECT
  USING (status = 'active');

-- REDEMPTIONS: Users can view their own redemptions
CREATE POLICY "Users can view own redemptions"
  ON redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- OFFER_COMPLETIONS: Users can view their own completions
CREATE POLICY "Users can view own offer completions"
  ON offer_completions FOR SELECT
  USING (auth.uid() = user_id);

-- REFERRALS: Users can view referrals they're involved in
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_redemptions_updated_at
  BEFORE UPDATE ON redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate user's total points from ledger
-- This is the ONLY way to get total points - never store it
CREATE OR REPLACE FUNCTION public.get_user_points(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(delta) FROM points_ledger WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
