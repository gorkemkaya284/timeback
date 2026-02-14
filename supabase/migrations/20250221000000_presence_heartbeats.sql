-- Presence heartbeats: track online users (last 60s = active).
-- One row per user; upsert on conflict.

CREATE TABLE IF NOT EXISTS public.presence_heartbeats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_heartbeats_last_seen
  ON public.presence_heartbeats (last_seen DESC);

ALTER TABLE public.presence_heartbeats ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own row.
CREATE POLICY "Users can select own heartbeat"
  ON public.presence_heartbeats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heartbeat"
  ON public.presence_heartbeats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own heartbeat"
  ON public.presence_heartbeats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS for admin reads.
COMMENT ON TABLE public.presence_heartbeats IS 'Real-time online presence; last_seen within 60s = active';
