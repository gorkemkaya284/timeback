-- Add kind column to rewards if missing (DB_ERROR 42703)
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'gift';

UPDATE public.rewards
SET kind = 'bank_transfer'
WHERE lower(title) LIKE '%havale%' OR lower(title) LIKE '%banka%';
