-- ============================================
-- FAZ 4b: Quotation Validity & Expiry
-- ============================================

-- 1. Add valid_until column
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS valid_until DATE;

-- 2. Extend status enum to include 'expired'
-- Note: Supabase doesn't use formal enums here, the check is in the app layer
-- The status column is TEXT, so we just need to handle 'expired' in code

-- 3. Function to auto-expire quotations past their validity date
CREATE OR REPLACE FUNCTION expire_overdue_quotations()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE quotations
  SET status = 'expired', updated_at = NOW()
  WHERE valid_until < CURRENT_DATE
    AND status IN ('draft', 'sent')
    AND valid_until IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Set default validity for existing quotations (30 days from creation)
-- Only for quotations without valid_until
UPDATE quotations
SET valid_until = (created_at::date + INTERVAL '30 days')::date
WHERE valid_until IS NULL;
