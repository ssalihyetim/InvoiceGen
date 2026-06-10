-- =====================================================
-- ROLLBACK Migration for Schema Fixes
-- Date: 2025-02-03
-- Purpose: Rollback changes if something goes wrong
-- =====================================================

-- Remove triggers first
DROP TRIGGER IF EXISTS set_quotation_number ON quotations;

-- Remove functions
DROP FUNCTION IF EXISTS generate_quotation_number();

-- Remove indexes
DROP INDEX IF EXISTS idx_quotations_number_pattern;

-- Remove columns from quotation_items
ALTER TABLE quotation_items
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS discount_amount,
  DROP COLUMN IF EXISTS subtotal;

-- Remove columns from quotations
ALTER TABLE quotations
  DROP COLUMN IF EXISTS final_amount,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS subtotal;

-- Note: This rollback will NOT restore data in these columns
-- Only use if migration fails or causes critical issues
