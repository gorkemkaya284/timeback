-- Expanded rewards seed: Google Play, App Store, Steam, Netflix, Spotify, Bank Transfer
-- Upsert: insert if not exists (by title), then variants.
-- 1P = 0.01 TL => cost_points = denomination_tl * 100

-- Helper: insert reward and return id (skip if exists by title)
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

  -- Netflix
  INSERT INTO public.rewards (title, provider, kind, is_active, sort_order)
  SELECT 'Netflix', 'manual', 'gift', true, 40
  WHERE NOT EXISTS (SELECT 1 FROM public.rewards WHERE title = 'Netflix')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, is_active)
    VALUES (v_id, 100, 10000, NULL, true), (v_id, 200, 20000, NULL, true);
  END IF;

  -- Spotify
  INSERT INTO public.rewards (title, provider, kind, is_active, sort_order)
  SELECT 'Spotify', 'manual', 'gift', true, 50
  WHERE NOT EXISTS (SELECT 1 FROM public.rewards WHERE title = 'Spotify')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, is_active)
    VALUES (v_id, 100, 10000, NULL, true), (v_id, 200, 20000, NULL, true);
  END IF;

  -- Banka Havalesi (upsert: might already exist)
  INSERT INTO public.rewards (title, provider, kind, is_active, sort_order)
  SELECT 'Banka Havalesi', 'manual', 'bank_transfer', true, 60
  WHERE NOT EXISTS (SELECT 1 FROM public.rewards WHERE title = 'Banka Havalesi')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.reward_variants (reward_id, denomination_tl, cost_points, stock, daily_limit_per_user, min_account_age_days, is_active)
    VALUES (v_id, 300, 30000, NULL, 1, 3, true);
  END IF;
END $$;
