-- =====================================================
-- MIGRATION: Add Structured Product Fields
-- Date: 2025-01-20
-- Purpose: Enable weighted matching algorithm with structured product tagging
-- Author: AI-powered migration for Invoice Generator
-- =====================================================

-- 1. Add new structured fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS brand TEXT,                          -- Marka (e.g., "NTG", "VESBO", "IKSAN")
ADD COLUMN IF NOT EXISTS product_subtype TEXT,                -- Ürün alt tipi (e.g., "EF", "PE", "U-PVC")
ADD COLUMN IF NOT EXISTS size_measurement TEXT,               -- Ölçü (e.g., "63-50", "20-25", "110")
ADD COLUMN IF NOT EXISTS material TEXT,                       -- Hammadde (e.g., "PE", "HDPE", "U-PVC", "UH-PVC")
ADD COLUMN IF NOT EXISTS pressure_class TEXT DEFAULT 'PN10',  -- Basınç sınıfı (e.g., "PN10", "PN16")
ADD COLUMN IF NOT EXISTS product_features TEXT;               -- Ürün özellikleri (e.g., "Siyah", "Flanşlı")

-- 2. Create indexes for fast filtering on new fields
CREATE INDEX IF NOT EXISTS idx_products_brand
  ON products(brand) WHERE brand IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_subtype
  ON products(product_subtype) WHERE product_subtype IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_size
  ON products(size_measurement) WHERE size_measurement IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_material
  ON products(material) WHERE material IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_pressure
  ON products(pressure_class) WHERE pressure_class IS NOT NULL;

-- 3. Create composite index for weighted queries (most common combination)
CREATE INDEX IF NOT EXISTS idx_products_weighted_match
  ON products(product_subtype, size_measurement, material, brand)
  WHERE product_subtype IS NOT NULL;

-- 4. Add computed column for normalized product code (uppercase, no spaces)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_code_normalized TEXT
  GENERATED ALWAYS AS (upper(regexp_replace(product_code, '\s+', '', 'g'))) STORED;

CREATE INDEX IF NOT EXISTS idx_products_code_normalized
  ON products(product_code_normalized);

-- 5. Update search_text trigger to include new fields
DROP TRIGGER IF EXISTS trigger_update_products_search_text ON products;
DROP TRIGGER IF EXISTS products_search_text_update ON products;
DROP FUNCTION IF EXISTS update_products_search_text() CASCADE;

CREATE OR REPLACE FUNCTION update_products_search_text()
RETURNS TRIGGER AS $$
BEGIN
  -- Concatenate all searchable fields including new structured fields
  NEW.search_text :=
    COALESCE(NEW.brand, '') || ' ' ||
    COALESCE(NEW.product_type, '') || ' ' ||
    COALESCE(NEW.product_subtype, '') || ' ' ||
    COALESCE(NEW.size_measurement, '') || ' ' ||
    COALESCE(NEW.diameter, '') || ' ' ||
    COALESCE(NEW.material, '') || ' ' ||
    COALESCE(NEW.pressure_class, '') || ' ' ||
    COALESCE(NEW.product_code, '') || ' ' ||
    COALESCE(NEW.product_features, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.unit, '');

  -- Update full-text search vector (Turkish language support)
  NEW.search_vector := to_tsvector('turkish', NEW.search_text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger with new function
CREATE TRIGGER trigger_update_products_search_text
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_search_text();

-- 6. Add helpful comments to new columns
COMMENT ON COLUMN products.brand IS 'Marka (Brand): Manufacturer name (e.g., NTG, VESBO, IKSAN)';
COMMENT ON COLUMN products.product_subtype IS 'Ürün Alt Tipi (Product Subtype): Specific product variant (e.g., EF, PE, U-PVC, Coupler)';
COMMENT ON COLUMN products.size_measurement IS 'Ölçü (Size/Measurement): Numeric measurements (e.g., 63-50, 20-25, 110)';
COMMENT ON COLUMN products.material IS 'Hammadde (Material): Raw material type (e.g., PE, HDPE, U-PVC, UH-PVC)';
COMMENT ON COLUMN products.pressure_class IS 'Basınç Sınıfı (Pressure Class): Pressure rating (e.g., PN10, PN16), defaults to PN10';
COMMENT ON COLUMN products.product_features IS 'Ürün Özellikleri (Product Features): Additional descriptive features (e.g., Siyah, Flanşlı)';

-- 7. Refresh search vectors for all existing products (will use existing data)
-- This will trigger the updated search_text function for all rows
UPDATE products SET updated_at = NOW();

-- 8. Create analytics view for monitoring structured field population
CREATE OR REPLACE VIEW v_product_data_quality AS
SELECT
  COUNT(*) as total_products,
  COUNT(brand) as has_brand,
  COUNT(product_subtype) as has_subtype,
  COUNT(size_measurement) as has_size,
  COUNT(material) as has_material,
  COUNT(pressure_class) as has_pressure,
  COUNT(product_features) as has_features,
  ROUND(100.0 * COUNT(brand) / COUNT(*), 1) as brand_fill_rate,
  ROUND(100.0 * COUNT(product_subtype) / COUNT(*), 1) as subtype_fill_rate,
  ROUND(100.0 * COUNT(size_measurement) / COUNT(*), 1) as size_fill_rate,
  ROUND(100.0 * COUNT(material) / COUNT(*), 1) as material_fill_rate,
  ROUND(100.0 * COUNT(pressure_class) / COUNT(*), 1) as pressure_fill_rate,
  ROUND(100.0 * COUNT(product_features) / COUNT(*), 1) as features_fill_rate
FROM products;

COMMENT ON VIEW v_product_data_quality IS 'Data quality metrics for structured product fields';

-- 9. Create helper function to extract size numbers (for backward compatibility)
CREATE OR REPLACE FUNCTION extract_size_numbers(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Extract size patterns like "63-50", "20-25", "110"
  RETURN (
    SELECT regexp_match(text_input, '(\d{2,3}[-x]\d{2,3}|\d{2,3})', 'i')
  )[1];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION extract_size_numbers IS 'Helper function to extract size measurements from text';

-- Migration complete
-- Next step: Run AI-powered data migration to populate structured fields
-- Command: npm run migrate:products
