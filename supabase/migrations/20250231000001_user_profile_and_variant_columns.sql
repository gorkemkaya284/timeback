-- ============================================
-- C) User level for rate limit — use profiles if exists, else tb_user_profile
-- ============================================
-- Add level to existing profiles (default 1)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'level') THEN
    ALTER TABLE public.profiles ADD COLUMN level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10);
  END IF;
END $$;

-- Fallback: if no profiles table, create tb_user_profile
CREATE TABLE IF NOT EXISTS public.tb_user_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- D) tb_reward_variants — stock_remaining, cooldown_seconds, per_user_daily_limit
-- (Keep variant_id; existing: stock, daily_limit_per_user, is_active)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tb_reward_variants') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_reward_variants' AND column_name = 'stock_remaining') THEN
      ALTER TABLE public.tb_reward_variants ADD COLUMN stock_remaining INT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_reward_variants' AND column_name = 'cooldown_seconds') THEN
      ALTER TABLE public.tb_reward_variants ADD COLUMN cooldown_seconds INT NULL CHECK (cooldown_seconds IS NULL OR cooldown_seconds >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_reward_variants' AND column_name = 'per_user_daily_limit') THEN
      ALTER TABLE public.tb_reward_variants ADD COLUMN per_user_daily_limit INT NULL;
    END IF;
  END IF;
  -- Legacy reward_variants (if used anywhere)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reward_variants') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reward_variants' AND column_name = 'stock_remaining') THEN
      ALTER TABLE public.reward_variants ADD COLUMN stock_remaining INT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reward_variants' AND column_name = 'cooldown_seconds') THEN
      ALTER TABLE public.reward_variants ADD COLUMN cooldown_seconds INT NULL CHECK (cooldown_seconds IS NULL OR cooldown_seconds >= 0);
    END IF;
  END IF;
END $$;
