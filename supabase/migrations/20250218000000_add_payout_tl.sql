-- Ensure payout_tl exists for offerwall_events (required by AdGem postback).
ALTER TABLE public.offerwall_events
  ADD COLUMN IF NOT EXISTS payout_tl NUMERIC(12,4) NULL;
