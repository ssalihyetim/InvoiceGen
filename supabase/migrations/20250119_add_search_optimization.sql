-- =====================================================
-- FAZ 1: Database Optimizasyonu
-- Amaç: Full-text search ve vector search hazırlığı
-- Tarih: 2025-01-19
-- =====================================================

-- 1. pgvector extension (vector similarity search için)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Full-text search alanları ekle
ALTER TABLE products
ADD COLUMN IF NOT EXISTS search_text TEXT,
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 3. search_text'i otomatik güncelle (trigger)
-- Her ürün eklendiğinde/güncellendiğinde tüm alanları birleştir
CREATE OR REPLACE FUNCTION update_products_search_text()
RETURNS TRIGGER AS $$
BEGIN
  -- Tüm alanları birleştir (boşluklar önemli - sayıları yakalamak için)
  NEW.search_text :=
    COALESCE(NEW.product_type, '') || ' ' ||
    COALESCE(NEW.diameter, '') || ' ' ||
    COALESCE(NEW.product_code, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.unit, '');

  -- Türkçe full-text search vector'ü oluştur
  NEW.search_vector := to_tsvector('turkish', NEW.search_text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger'ı products tablosuna ekle
DROP TRIGGER IF EXISTS products_search_text_update ON products;
CREATE TRIGGER products_search_text_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_search_text();

-- 5. Mevcut tüm ürünleri güncelle (trigger tetiklenir)
UPDATE products SET updated_at = NOW();

-- 6. Vector embedding alanı (opsiyonel - ileride kullanılabilir)
-- OpenAI text-embedding-ada-002: 1536 dimensions
ALTER TABLE products
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 7. Performance indexleri
-- GIN index: Full-text search için (çok hızlı)
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products USING GIN(search_vector);

-- Text search için de index (opsiyonel ama hızlandırır)
CREATE INDEX IF NOT EXISTS idx_products_search_text
  ON products USING GIN(to_tsvector('turkish', search_text));

-- Ürün kodu için index (exact match için)
CREATE INDEX IF NOT EXISTS idx_products_code
  ON products(product_code) WHERE product_code IS NOT NULL;

-- Ürün tipi için index (kategori filtrelemesi)
CREATE INDEX IF NOT EXISTS idx_products_type
  ON products(product_type) WHERE product_type IS NOT NULL;

-- Çap için index (ölçü bazlı arama)
CREATE INDEX IF NOT EXISTS idx_products_diameter
  ON products(diameter) WHERE diameter IS NOT NULL;

-- 8. Vector similarity için HNSW index (pgvector)
-- Not: Embedding'ler eklendikten SONRA oluşturulacak
-- Şimdilik yorum satırı olarak bırakıyoruz
-- CREATE INDEX IF NOT EXISTS idx_products_embedding
--   ON products USING hnsw(embedding vector_cosine_ops);

-- 9. Faydalı view: Arama için optimize edilmiş ürün listesi
CREATE OR REPLACE VIEW products_searchable AS
SELECT
  id,
  product_code,
  product_type,
  diameter,
  base_price,
  currency,
  unit,
  description,
  search_text,
  -- Sayıları çıkar (regex ile)
  (SELECT array_agg(match[1]::text)
   FROM regexp_matches(search_text, '\d+', 'g') AS match) AS extracted_numbers
FROM products;

-- 10. Analytics tablosu (Faz 5 için hazırlık)
CREATE TABLE IF NOT EXISTS match_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_request TEXT NOT NULL,
  matched_product_id UUID REFERENCES products(id),
  strategy TEXT NOT NULL CHECK (strategy IN ('exact', 'fulltext', 'vector', 'ai')),
  confidence DECIMAL(3,2),
  execution_time INTEGER, -- milliseconds
  tokens_used INTEGER,    -- OpenAI tokens (if used)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_strategy ON match_analytics(strategy);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON match_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_product ON match_analytics(matched_product_id);

-- Migration tamamlandı!
-- Test sorgusu: SELECT * FROM products_searchable WHERE search_vector @@ to_tsquery('turkish', 'EF & 63');
