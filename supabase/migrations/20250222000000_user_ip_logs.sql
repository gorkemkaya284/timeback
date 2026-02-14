-- IP activity log for admin visibility (login, admin actions).
CREATE TABLE IF NOT EXISTS public.user_ip_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_ip_logs_user_id ON public.user_ip_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ip_logs_created_at ON public.user_ip_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ip_logs_event ON public.user_ip_logs(event);
