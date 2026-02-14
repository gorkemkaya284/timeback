-- Run in Supabase SQL Editor to add get_all_users_points RPC
-- Used by Admin > Users to show total_points and last_activity per user

CREATE OR REPLACE FUNCTION public.get_all_users_points()
RETURNS TABLE (user_id UUID, total_points BIGINT, last_activity TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    pl.user_id,
    COALESCE(SUM(pl.delta), 0)::BIGINT AS total_points,
    MAX(pl.created_at) AS last_activity
  FROM public.points_ledger pl
  GROUP BY pl.user_id;
$$;
