-- Withdrawals view: maps redemptions to withdrawal-shaped columns for unified display.
-- Run in Supabase SQL Editor if migrations are not used.

CREATE OR REPLACE VIEW public.withdrawals AS
SELECT
  id,
  user_id,
  created_at,
  NULL::numeric AS amount_tl,
  points_spent AS points,
  status,
  'reward'::text AS method,
  reward_id::text AS reference,
  NULL::timestamptz AS processed_at
FROM public.redemptions;
