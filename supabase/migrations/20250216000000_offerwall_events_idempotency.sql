-- AdGem postback idempotency fix
-- 1) Deduplicate: keep earliest created_at per (provider, transaction_id)
-- 2) Ensure partial unique index exists

-- Step 1: Remove duplicate rows, keeping the earliest per (provider, transaction_id)
WITH ranked AS (
  SELECT
    id,
    provider,
    transaction_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY provider, transaction_id ORDER BY created_at ASC) AS rn
  FROM public.offerwall_events
  WHERE transaction_id IS NOT NULL
)
DELETE FROM public.offerwall_events e
USING ranked r
WHERE e.id = r.id AND r.rn > 1;

-- Step 2: Drop table unique constraint if it exists (to use partial index instead)
ALTER TABLE public.offerwall_events DROP CONSTRAINT IF EXISTS offerwall_events_provider_transaction_id_key;

-- Step 3: Create partial unique index if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'offerwall_events_provider_transaction_id_uniq'
  ) THEN
    CREATE UNIQUE INDEX offerwall_events_provider_transaction_id_uniq
      ON public.offerwall_events (provider, transaction_id)
      WHERE transaction_id IS NOT NULL;
  END IF;
END $$;
