-- ============================================
-- A) tb_security_events — security event log + fingerprint
-- ============================================
CREATE TABLE IF NOT EXISTS public.tb_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login', 'session_refresh', 'offerwall_click', 'offerwall_postback',
    'offerwall_credit_attempt', 'offerwall_credited', 'redeem_attempt', 'redeem_success',
    'redeem_blocked', 'admin_action'
  )),
  ip INET NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  device_fingerprint TEXT NULL,
  country TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tb_security_events_user_created
  ON public.tb_security_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tb_security_events_ip_created
  ON public.tb_security_events(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_security_events_fingerprint_created
  ON public.tb_security_events(device_fingerprint, created_at DESC)
  WHERE device_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tb_security_events_type_created
  ON public.tb_security_events(event_type, created_at DESC);

-- RLS: no direct user access; server/service role only
ALTER TABLE public.tb_security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tb_security_events_no_select" ON public.tb_security_events FOR SELECT USING (false);
CREATE POLICY "tb_security_events_service_role_all" ON public.tb_security_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- B) tb_risk_assessments — risk scoring + flags
-- ============================================
CREATE TABLE IF NOT EXISTS public.tb_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('offerwall_event', 'reward_redemption')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  flags TEXT[] NOT NULL DEFAULT '{}',
  recommended_action TEXT NOT NULL CHECK (recommended_action IN ('allow', 'review', 'block')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_tb_risk_assessments_user_created
  ON public.tb_risk_assessments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_risk_assessments_entity
  ON public.tb_risk_assessments(entity_type, entity_id);

ALTER TABLE public.tb_risk_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tb_risk_assessments_no_select" ON public.tb_risk_assessments FOR SELECT USING (false);
CREATE POLICY "tb_risk_assessments_service_role_all" ON public.tb_risk_assessments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- F) tb_admin_audit_log — admin audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS public.tb_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NULL,
  entity_id UUID NULL,
  before_state JSONB NULL,
  after_state JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tb_admin_audit_log_admin_created
  ON public.tb_admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_admin_audit_log_entity
  ON public.tb_admin_audit_log(entity_type, entity_id)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

ALTER TABLE public.tb_admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tb_admin_audit_log_no_select" ON public.tb_admin_audit_log FOR SELECT USING (false);
CREATE POLICY "tb_admin_audit_log_service_role_all" ON public.tb_admin_audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- E) tb_fulfillment_jobs — fulfillment queue
-- ============================================
CREATE TABLE IF NOT EXISTS public.tb_fulfillment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id UUID NOT NULL UNIQUE REFERENCES public.tb_reward_redemptions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'success', 'failed')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT NULL,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tb_fulfillment_jobs_next_run
  ON public.tb_fulfillment_jobs(next_run_at)
  WHERE status IN ('queued', 'processing');

ALTER TABLE public.tb_fulfillment_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tb_fulfillment_jobs_no_select" ON public.tb_fulfillment_jobs FOR SELECT USING (false);
CREATE POLICY "tb_fulfillment_jobs_service_role_all" ON public.tb_fulfillment_jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
