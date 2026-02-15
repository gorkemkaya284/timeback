-- ============================================
-- Admin read-only: user risk summary view
-- Source: tb_risk_assessments + tb_security_events (no new columns on existing tables)
-- ============================================

CREATE OR REPLACE VIEW public.v_admin_user_risk_summary AS
SELECT
  u.user_id,
  u.risk_max_24h,
  u.blocks_24h,
  u.risk_max_7d,
  u.blocks_7d,
  u.last_risk_at,
  e.last_ip,
  LEFT(e.last_user_agent, 80) AS last_user_agent
FROM (
  SELECT
    user_id,
    (MAX(risk_score) FILTER (WHERE created_at >= now() - interval '24 hours'))::INT AS risk_max_24h,
    (COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND recommended_action = 'block'))::INT AS blocks_24h,
    (MAX(risk_score) FILTER (WHERE created_at >= now() - interval '7 days'))::INT AS risk_max_7d,
    (COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days' AND recommended_action = 'block'))::INT AS blocks_7d,
    MAX(created_at) AS last_risk_at
  FROM public.tb_risk_assessments
  GROUP BY user_id
) u
LEFT JOIN LATERAL (
  SELECT ip::TEXT AS last_ip, user_agent AS last_user_agent
  FROM public.tb_security_events
  WHERE user_id = u.user_id
  ORDER BY created_at DESC
  LIMIT 1
) e ON true;

COMMENT ON VIEW public.v_admin_user_risk_summary IS 'Admin read model: risk aggregates and last IP/UA per user from tb_risk_assessments and tb_security_events';
