-- IP activity log for admin visibility.
-- Recreates table with desired schema.
DROP TABLE IF EXISTS public.user_ip_logs;

CREATE TABLE public.user_ip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip TEXT NOT NULL,
  user_agent TEXT,
  path TEXT,
  event TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_ip_logs_user_created ON public.user_ip_logs(user_id, created_at DESC);
CREATE INDEX idx_user_ip_logs_ip_created ON public.user_ip_logs(ip, created_at DESC);
