-- =====================================================
-- Fix Quotation Status Terminology Fork
-- Date: 2026-06-09
-- Purpose: Reconcile 'accepted' (legacy DB constraint) vs 'approved' (UI + new
--          triggers). Canonical value is 'approved'. Also add 'expired' to the
--          allowed set and wire up automatic expiry.
--
-- Root cause: base schema CHECK allowed ('draft','sent','accepted','rejected')
-- but every UI surface and the notify_quotation_status_change trigger use
-- 'approved' and 'expired'. Legacy rows may carry 'accepted'. This migration
-- makes the data and the constraint agree with the UI.
-- =====================================================

-- 1. Migrate any legacy 'accepted' rows to the canonical 'approved'
UPDATE quotations
SET status = 'approved'
WHERE status = 'accepted';

-- 2. Replace the CHECK constraint to match what the app actually writes.
--    Drop whatever the base schema named it, then re-add with the full set.
--    (The base schema created it inline, so Postgres named it
--     quotations_status_check. Guarded with IF EXISTS for idempotency.)
ALTER TABLE quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

ALTER TABLE quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired'));

-- 3. Backfill validity for any quotation missing it (30 days from creation).
--    Re-asserts the default from 20260315_quotation_validity in case rows were
--    inserted without it.
UPDATE quotations
SET valid_until = (created_at::date + INTERVAL '30 days')::date
WHERE valid_until IS NULL;

-- 4. Schedule automatic expiry. expire_overdue_quotations() already exists
--    (20260315_quotation_validity.sql) but nothing called it. Wire it to
--    pg_cron if the extension is available; otherwise this block is a no-op
--    and expiry must be triggered via the /api/expire-quotations route.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any prior schedule with the same name, then (re)create it.
    PERFORM cron.unschedule('expire-overdue-quotations')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-quotations'
      );

    PERFORM cron.schedule(
      'expire-overdue-quotations',
      '0 1 * * *',                       -- every day at 01:00
      $$SELECT expire_overdue_quotations();$$
    );
    RAISE NOTICE 'pg_cron job "expire-overdue-quotations" scheduled (daily 01:00).';
  ELSE
    RAISE NOTICE 'pg_cron not installed — call /api/expire-quotations to expire manually.';
  END IF;
END
$$;
