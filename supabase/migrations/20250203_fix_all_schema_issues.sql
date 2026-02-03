-- =====================================================
-- Fix All Schema Mismatches and Issues
-- Date: 2025-02-03
-- Purpose: Add missing columns, fix constraints
-- =====================================================

-- 1. Add missing columns to quotations table
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS final_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY' CHECK (currency IN ('TRY', 'USD', 'EUR')),
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;

-- Backfill existing data
UPDATE quotations
SET final_amount = total_amount - COALESCE(discount_amount, 0),
    subtotal = total_amount
WHERE final_amount IS NULL OR final_amount = 0;

-- 2. Add missing columns to quotation_items table
ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY' CHECK (currency IN ('TRY', 'USD', 'EUR')),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;

-- Backfill currency from products
UPDATE quotation_items qi
SET currency = COALESCE(p.currency, 'TRY'),
    discount_amount = (qi.unit_price * qi.quantity * COALESCE(qi.discount_percentage, 0) / 100),
    subtotal = (qi.unit_price * qi.quantity) - (qi.unit_price * qi.quantity * COALESCE(qi.discount_percentage, 0) / 100)
FROM products p
WHERE qi.product_id = p.id
  AND (qi.currency IS NULL OR qi.discount_amount = 0 OR qi.subtotal = 0);

-- 3. Create function to auto-generate quotation numbers
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  new_number TEXT;
BEGIN
  -- Only generate if empty
  IF NEW.quotation_number IS NOT NULL AND NEW.quotation_number != '' THEN
    RETURN NEW;
  END IF;

  -- Get current year
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quotation_number FROM 'TEK-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM quotations
  WHERE quotation_number LIKE 'TEK-' || year_part || '-%';

  -- Generate new quotation number
  new_number := 'TEK-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');

  NEW.quotation_number := new_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for auto-generation
DROP TRIGGER IF EXISTS set_quotation_number ON quotations;

CREATE TRIGGER set_quotation_number
  BEFORE INSERT ON quotations
  FOR EACH ROW
  WHEN (NEW.quotation_number IS NULL OR NEW.quotation_number = '')
  EXECUTE FUNCTION generate_quotation_number();

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_quotations_number_pattern
  ON quotations(quotation_number)
  WHERE quotation_number LIKE 'TEK-%';

-- 6. Add comments for documentation
COMMENT ON COLUMN import_history.total_rows IS 'Total rows in Excel/CSV (not total_products!)';
COMMENT ON TRIGGER set_quotation_number ON quotations IS
  'Auto-generates quotation number in format TEK-YYYY-0001 when empty';
