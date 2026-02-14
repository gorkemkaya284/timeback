-- Offerwall events: raw postback events for idempotency and auditing.
-- Used by AdGem and other offerwall postbacks.

CREATE TABLE IF NOT EXISTS public.offerwall_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  user_id UUID NULL,
  transaction_id TEXT NULL,
  status TEXT NULL,
  reward_points INTEGER NULL,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, transaction_id)
);
