-- ============================================
-- F) Monitoring views for admin dashboard
-- ============================================

-- v_daily_payout: daily total payout_tl (by date, Europe/Istanbul)
CREATE OR REPLACE VIEW public.v_daily_payout AS
SELECT
  date_trunc('day', created_at AT TIME ZONE 'Europe/Istanbul')::date AS day_ist,
  SUM(payout_tl)::INT AS total_payout_tl,
  COUNT(*)::INT AS redemption_count
FROM public.tb_reward_redemptions
WHERE status IN ('approved', 'fulfilled')
GROUP BY 1
ORDER BY 1 DESC;

-- v_daily_redemptions: count by status per day
CREATE OR REPLACE VIEW public.v_daily_redemptions AS
SELECT
  date_trunc('day', created_at AT TIME ZONE 'Europe/Istanbul')::date AS day_ist,
  status,
  COUNT(*)::INT AS cnt
FROM public.tb_reward_redemptions
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- v_top_ips: last 24h most active IPs (from security events)
CREATE OR REPLACE VIEW public.v_top_ips AS
SELECT
  ip::TEXT,
  COUNT(*)::INT AS event_count,
  COUNT(DISTINCT user_id)::INT AS distinct_users
FROM public.tb_security_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY ip
ORDER BY event_count DESC
LIMIT 50;
