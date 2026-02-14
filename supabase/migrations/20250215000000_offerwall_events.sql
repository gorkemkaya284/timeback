-- Offerwall events: raw postback events for idempotency and auditing.
-- Used by AdGem and other offerwall postbacks.

CREATE TABLE IF NOT EXISTS public.offerwall_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  user_id TEXT,
  transaction_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_offerwall_events_provider_tx
  ON public.offerwall_events (provider, transaction_id)
  WHERE transaction_id IS NOT NULL AND transaction_id != '';
