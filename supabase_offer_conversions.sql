-- Offerwall conversions: store completed offers to prevent duplicate credits.
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.offer_conversions (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  offer_id TEXT,
  reward_points INTEGER NOT NULL CHECK (reward_points > 0),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_conversions_user_id ON public.offer_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_conversions_created_at ON public.offer_conversions(created_at DESC);
