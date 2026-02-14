-- Admin allowlist: only users in this table (or in ADMIN_EMAILS env) can access /app/admin when DEV_MODE=false.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admins IS 'Allowlist for admin panel access.';

-- Optional: add your first admin (replace UUID with real auth.users id)
-- INSERT INTO public.admins (user_id) VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx') ON CONFLICT (user_id) DO NOTHING;
