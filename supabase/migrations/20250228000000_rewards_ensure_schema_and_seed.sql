-- Ensure rewards schema has provider (for DBs created without it) and seed if empty.
-- 1P = 0.01 TL => cost_points = denomination_tl * 100

-- 1) Add provider to rewards if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rewards')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rewards' AND column_name = 'provider') THEN
    ALTER TABLE public.rewards ADD COLUMN provider TEXT NOT NULL DEFAULT 'manual';
  END IF;
END $$;

-- 2) Seed: Google Play 50/100/250, App Store 50/100/250, Steam 50/100/200, Banka Havalesi 300 (idempotent)
DO $$
DECLARE
  v_id UUID;
BEGIN
  -- Google Play Hediye Kartı
  INSERT INTO public.rewards (title, provider, kind, is_active, sort_order)
  SELECT 'Google Play Hediye Kartı', 'manual', 'gift', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM public.rewards WHERE title = 'Google Play Hediye Kartı')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, is_active)
    VALUES (v_id, 50, 5000, NULL, true), (v_id, 100, 10000, NULL, true), (v_id, 250, 25000, NULL, true);
  END IF;

  -- App Store & iTunes
  INSERT INTO public.rewards (title, provider, kind, is_active, sort_order)
  SELECT 'App Store & iTunes', 'manual', 'gift', true, 20
  WHERE NOT EXISTS (SELECT 1 FROM public.rewards WHERE title = 'App Store & iTunes')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, is_active)
    VALUES (v_id, 50, 5000, NULL, true), (v_id, 100, 10000, NULL, true), (v_id, 250, 25000, NULL, true);
  END IF;

  -- Steam Wallet
  INSERT INTO public.rewards (title, provider, kind, is_active, sort_order)
  SELECT 'Steam Wallet', 'manual', 'gift', true, 30
  WHERE NOT EXISTS (SELECT 1 FROM public.rewards WHERE title = 'Steam Wallet')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, is_active)
    VALUES (v_id, 50, 5000, NULL, true), (v_id, 100, 10000, NULL, true), (v_id, 200, 20000, NULL, true);
  END IF;

  -- Banka Havalesi
  INSERT INTO public.rewards (title, provider, kind, is_active, sort_order)
  SELECT 'Banka Havalesi', 'manual', 'bank_transfer', true, 60
  WHERE NOT EXISTS (SELECT 1 FROM public.rewards WHERE title = 'Banka Havalesi')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, daily_limit_per_user, min_account_age_days, is_active)
    VALUES (v_id, 300, 30000, NULL, 1, 3, true);
  END IF;
END $$;
