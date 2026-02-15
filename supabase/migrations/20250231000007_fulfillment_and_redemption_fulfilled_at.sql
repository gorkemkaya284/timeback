-- fulfilled_at on redemptions; fulfillment job creation is in app (on approve).
ALTER TABLE public.tb_reward_redemptions
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ NULL;
