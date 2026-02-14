-- Optional: add email to profiles (e.g. for display without hitting auth.users).
-- Run in Supabase SQL Editor after profiles table exists.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.profiles.email IS 'Cached from auth.users for display; optional.';
