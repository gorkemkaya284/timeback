-- Offerwall credit engine: credited_at and payout_tl for reward crediting.

ALTER TABLE public.offerwall_events
  ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS payout_tl NUMERIC(12,4) NULL;
