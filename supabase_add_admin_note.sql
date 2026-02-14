-- Add admin_note to redemptions for fulfill/reject notes
-- Run in Supabase SQL Editor

ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Ensure users can read own redemptions (if policy missing)
-- CREATE POLICY "Users can view own redemptions"
--   ON public.redemptions FOR SELECT
--   USING (auth.uid() = user_id);
