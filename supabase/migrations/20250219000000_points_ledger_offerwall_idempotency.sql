-- Unique constraint for offerwall credits: one ledger entry per (source, source_event_id).
-- ref_type = provider (e.g. 'adgem'), ref_id = offerwall_events.id
-- Enables idempotent credits; duplicate inserts return 23505 unique_violation.
CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_ref_type_ref_id_uniq
  ON public.points_ledger (ref_type, ref_id)
  WHERE ref_type IS NOT NULL AND ref_id IS NOT NULL;
