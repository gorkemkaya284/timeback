-- Offerwall events: raw postback events for idempotency and auditing.
-- Run in Supabase SQL Editor before using AdGem postback.

CREATE TABLE IF NOT EXISTS public.offerwall_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  user_id UUID NULL,
  transaction_id TEXT NULL,
  status TEXT NULL,
  reward_points INTEGER NULL,
  payout_tl NUMERIC(12,4) NULL,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credited_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS offerwall_events_provider_transaction_id_uniq
  ON public.offerwall_events (provider, transaction_id)
  WHERE transaction_id IS NOT NULL;
