# 📋 Otomatik Teklif Sistemi - Proje Planlama ve Durum Raporu

**Proje Adı:** InvoiceGen - AI Destekli Otomatik Teklif Sistemi
**Başlangıç:** 2025-01-18
**Son Güncelleme:** 2025-01-20
**Durum:** ✅ MVP Tamamlandı, Auth Eklenmesi Gerekiyor

---

## 📊 Proje Durumu Özeti

### ✅ Tamamlanan Fazlar

| Faz | Durum | Süre | Dosyalar |
|-----|-------|------|----------|
| **Faz 1-2:** Altyapı & Database | ✅ Tamamlandı | 1 gün | `lib/supabase.ts`, `migrations/*.sql` |
| **Faz 3:** Frontend Temel | ✅ Tamamlandı | 2 gün | `app/**/*.tsx`, `components/**/*.tsx` |
| **Faz 4:** Excel Import | ✅ Tamamlandı | 2 gün | `app/import/page.tsx`, `app/api/import/route.ts` |
| **Faz 5:** AI Eşleştirme | ✅ Tamamlandı | 2 gün | `supabase/functions/match-product/` |
| **Faz 7:** Teklif Oluşturma | ✅ Tamamlandı | 3 gün | `app/quotations/new/page.tsx` |
| **Faz 8:** AI Optimizasyon | ✅ Tamamlandı | 4 saat | Edge function v8 |
| **Faz 8.5:** Multi-Match | ✅ Tamamlandı | 2 saat | `components/quotations/*Modal.tsx` |

### 🔄 Devam Eden Faz

| Faz | Durum | Öncelik | Tahmini Süre |
|-----|-------|---------|--------------|
| **Faz 9:** Multi-Tenant Auth | 🔴 Başlanacak | **YÜKSEK** | 3-4 gün |

### ⏳ Bekleyen Fazlar

| Faz | Öncelik | Tahmini Süre | Açıklama |
|-----|---------|--------------|----------|
| Faz 10: İskonto Yönetimi | Orta | 1-2 gün | Firma bazlı iskonto kuralları |
| Faz 11: Excel/Email Export | Orta | 2 gün | Teklif PDF/Excel çıktısı |
| Faz 12: Teklif Yönetimi | Düşük | 1 gün | Teklif listesi ve durum takibi |

---

## 🏗️ Mevcut Sistem Mimarisi

### Backend (Supabase)

#### 1. Database Schema
**Dosya:** `supabase/migrations/*.sql`

**Tablolar:**
- ✅ `products` - Ürün kataloğu (10,000+ ürün destekli)
- ✅ `companies` - Firma bilgileri
- ✅ `quotations` - Teklifler
- ✅ `quotation_items` - Teklif kalemleri
- ✅ `discount_rules` - İskonto kuralları (henüz UI yok)
- ✅ `import_history` - Excel import geçmişi
- ✅ `match_analytics` - AI eşleştirme metrikleri

**Son Migration:**
- `20250119_add_search_optimization.sql` - Full-text search + pgvector

#### 2. Edge Functions
**Klasör:** `supabase/functions/`

**Aktif Fonksiyonlar:**
- ✅ `match-product/index.ts` (v8) - AI ürün eşleştirme
  - 3 aşamalı arama: Exact → Full-text → AI
  - Multi-match detection
  - 10,000+ ürün desteği
  - %99 maliyet azaltımı

**Deployment:**
```bash
# Supabase MCP üzerinden deploy edildi
supabase functions deploy match-product --verify-jwt=false
```

#### 3. Storage
**Bucket:** `excel-imports`
- Excel dosyaları import için yükleniyor

### Frontend (Next.js 14)

#### 1. Sayfa Yapısı
**Klasör:** `app/`

**Ana Sayfalar:**
- ✅ `app/page.tsx` - Dashboard (istatistikler)
- ✅ `app/products/page.tsx` - Ürün listesi ve yönetimi
- ✅ `app/companies/page.tsx` - Firma listesi ve yönetimi
- ✅ `app/quotations/page.tsx` - Teklif listesi
- ✅ `app/quotations/new/page.tsx` - Yeni teklif oluşturma
- ✅ `app/import/page.tsx` - Excel toplu import

**API Routes:**
- ✅ `app/api/import/route.ts` - Excel server-side processing

#### 2. Komponentler
**Klasör:** `components/`

**Quotation Komponentleri:**
- ✅ `components/quotations/ImageUploadTab.tsx` - OCR + görsel yükleme
- ✅ `components/quotations/ProductSelectionModal.tsx` - Tek talep multi-match
- ✅ `components/quotations/BatchMultiMatchModal.tsx` - Toplu multi-match

**Layout:**
- ✅ `components/layout/` - Header, Sidebar (henüz basit)

#### 3. Konfigürasyon
**Dosyalar:**
- ✅ `lib/supabase.ts` - Supabase client
- ✅ `.env.local` - API anahtarları
- ✅ `next.config.js` - Next.js ayarları

---

## 🎯 Tamamlanan Özellikler Detayı

### 1. AI Ürün Eşleştirme Optimizasyonu

**Problem:**
- Eski sistem: 1000 ürün limiti, 2-5 saniye, $70/ay maliyet
- Tüm ürünler her aramada OpenAI'ye gönderiliyordu

**Çözüm:**
- ✅ 3 aşamalı hibrit arama
- ✅ PostgreSQL full-text search (GIN index)
- ✅ OpenAI'ye sadece top 10 ürün
- ✅ Smart parsing (ürün kodu, pattern, keyword ayrıştırma)

**Sonuç:**
- ✅ 10x hız artışı (5s → 0.5s)
- ✅ %99 maliyet azaltımı ($70 → $0.30/ay)
- ✅ 10,000+ ürün desteği
- ✅ %95+ doğruluk korundu

**İlgili Dosyalar:**
- `supabase/functions/match-product/index.ts` - Edge function v8
- `supabase/migrations/20250119_add_search_optimization.sql` - DB optimizasyonu

**Dökümanlar:**
- `OPTIMIZASYON_PLANI.md` - İlk plan
- `OPTIMIZATION_REPORT.md` - Detaylı performans raporu
- `test-optimized-search.js` - Test scripti

### 2. Multi-Match Özelliği

**Problem:**
- Belirsiz talepler (örn: "63-50") için sistem rastgele ürün seçiyordu
- Personel hatalı ürün ekleyebiliyordu

**Çözüm:**
- ✅ Benzer confidence'a sahip ürünleri tespit etme
- ✅ Kullanıcıya modal ile seçim yaptırma
- ✅ Tek talep için `ProductSelectionModal`
- ✅ Toplu talepler için `BatchMultiMatchModal`

**Entegrasyon Noktaları:**
1. AI ile Ara tab → Tek modal
2. Excel yükleme → Batch modal
3. Görsel yükleme → Batch modal

**İlgili Dosyalar:**
- `components/quotations/ProductSelectionModal.tsx` - Tek talep UI
- `components/quotations/BatchMultiMatchModal.tsx` - Batch UI
- `app/quotations/new/page.tsx` - Entegrasyon

**Dökümanlar:**
- `MULTI_MATCH_IMPLEMENTATION.md` - Teknik detaylar
- `MULTI_MATCH_TESTING_GUIDE.md` - Test kılavuzu

### 3. Görsel Yükleme (OCR)

**Özellik:**
- ✅ Müşteri teklif listesi fotoğrafı yükleme
- ✅ Tesseract.js ile OCR
- ✅ Doğal dil miktar çıkarımı ("2 ADET" → 2)
- ✅ AI eşleştirme sonrası multi-match

**İlgili Dosyalar:**
- `components/quotations/ImageUploadTab.tsx` - OCR + UI
- `app/quotations/new/page.tsx` - Entegrasyon (handleImageProductsExtracted)

### 4. Excel Import

**Özellikler:**
- ✅ Drag & drop dosya yükleme
- ✅ Sütun eşleştirme (Türkçe/İngilizce)
- ✅ Çakışma çözme (upsert stratejisi)
- ✅ Toplu ürün import
- ✅ İki yöntem:
  1. **Ürün kataloğu import:** `app/import/page.tsx`
  2. **Teklif için toplu ekleme:** `app/quotations/new/page.tsx` (Excel Yükle butonu)

**İlgili Dosyalar:**
- `app/import/page.tsx` - Katalog import UI
- `app/api/import/route.ts` - Server-side processing
- `app/quotations/new/page.tsx` - Teklif için batch import

---

## 📈 Performans Metrikleri

### AI Eşleştirme Performansı

**Test Sonuçları (Edge Function v8):**

| Test | Talep | Strateji | Süre | Confidence | Maliyet |
|------|-------|----------|------|------------|---------|
| 1 | "NTG EF 63-50" | Exact | 608ms | %100 | $0 |
| 2 | "63-50 servis te" | Full-text | 175ms | %95 | $0 |
| 3 | "75-40" | Full-text | 135ms | %90 | $0 |
| 4 | "NTG EF 110-63 EF SERVİS TE" | Exact | 144ms | %100 | $0 |
| 5 | "büyük boy servis te lazım" | AI fallback | 2620ms | %90 | $0.001 |

**Strateji Dağılımı (100 arama):**
- %60-80: Exact match (ücretsiz)
- %20-30: Full-text (ücretsiz)
- %10-20: AI fallback (düşük maliyet)

**Maliyet Projeksiyonu:**
- 100 teklif/gün: ~$0.01/gün = **$0.30/ay**
- Eski sistem: **$70/ay**
- **Tasarruf: %99.5**

---

## 🔧 Teknik Detaylar

### Database Optimizasyonları

**Full-Text Search:**
```sql
-- Search vector (Turkish language support)
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- GIN index for fast search
CREATE INDEX idx_products_search_vector
  ON products USING GIN(search_vector);

-- Auto-update trigger
CREATE TRIGGER products_search_text_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_products_search_text();
```

**Performance Indexler:**
- `idx_products_search_vector` - Full-text search (GIN)
- `idx_products_code` - Ürün kodu (exact match)
- `idx_products_type` - Ürün tipi (filtreleme)
- `idx_products_diameter` - Çap (pattern search)

### Edge Function Mimarisi

**Dosya:** `supabase/functions/match-product/index.ts`

**Ana Fonksiyonlar:**

1. **parseCustomerRequest()**
```typescript
// Input: "63-50 servis te"
// Output: {
//   measurementPattern: "63-50",
//   numbers: ["63", "50"],
//   keywords: ["SERVIS", "TE"],  // Sayılar hariç!
//   productCode: undefined
// }
```

2. **exactMatch()**
```typescript
// Ürün kodu veya measurement pattern ile arama
// Tek ürün → return result
// Çoklu ürün → return null (full-text devam etsin)
```

3. **fullTextSearch()**
```typescript
// PostgreSQL tsvector search
// Pattern + keyword kombinasyonu
// Confidence scoring (sayı + keyword bonusları)
// Multi-match detection
```

4. **aiMatch()**
```typescript
// Sadece top 10 ürün OpenAI'ye gönderilir
// Model: gpt-4o-mini
// Temperature: 0.3
// Response format: JSON
```

**Response Format:**
```json
{
  "matched": [
    {
      "product_id": "uuid",
      "product": { /* product object */ },
      "confidence": 0.95,
      "strategy": "fulltext",
      "reasoning": "Pattern + 2/2 kelime eşleşmesi"
    }
  ],
  "method": "fulltext-search",
  "isMultiMatch": true,  // Yeni!
  "multiMatchMessage": "5 benzer ürün bulundu...",
  "totalTime": 265,
  "parsed": { /* parsing detayları */ }
}
```

### Frontend State Management

**Ana State (app/quotations/new/page.tsx):**

```typescript
// Firma ve ürün verileri
const [companies, setCompanies] = useState<Company[]>([])
const [products, setProducts] = useState<Product[]>([])
const [selectedCompany, setSelectedCompany] = useState<string>('')

// Teklif kalemleri
const [items, setItems] = useState<QuotationItem[]>([])

// AI arama
const [customerRequest, setCustomerRequest] = useState('')
const [searching, setSearching] = useState(false)

// Tek talep multi-match
const [showMultiMatchModal, setShowMultiMatchModal] = useState(false)
const [multiMatchResults, setMultiMatchResults] = useState<any[]>([])

// Batch multi-match (Excel/Görsel)
const [showBatchModal, setShowBatchModal] = useState(false)
const [batchPendingMatches, setBatchPendingMatches] = useState<any[]>([])
```

---

## 🧪 Test & Debugging

### Test Scriptleri

**1. Backend Test:**
```bash
# Edge function test
node test-optimized-search.js

# Sonuç: 5/5 test geçti
```

**2. Frontend Test:**
- http://localhost:3001/quotations/new
- Manuel test senaryoları (MULTI_MATCH_TESTING_GUIDE.md)

### Analytics Monitoring

**Tablo:** `match_analytics`

**Sorgu Örneği:**
```sql
-- Strateji dağılımı
SELECT
  strategy,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  AVG(execution_time) as avg_time_ms,
  SUM(tokens_used) as total_tokens
FROM match_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY strategy;
```

**Sonuç:**
```
strategy  | count | avg_confidence | avg_time_ms | total_tokens
----------|-------|----------------|-------------|-------------
exact     | 80    | 0.975          | 265         | 0
fulltext  | 15    | 0.85           | 150         | 0
ai        | 5     | 0.88           | 2450        | 3950
```

---

## 📄 Döküman Yapısı

### Proje Ana Dökümanları

1. **CLAUDE.md** - Proje genel bakış ve roadmap
2. **PROJE_PLANLAMA.md** - Bu dosya (detaylı planlama)
3. **README.md** - Kurulum ve kullanım (oluşturulacak)

### Optimizasyon Dökümanları

1. **OPTIMIZASYON_PLANI.md**
   - İlk optimizasyon planı
   - Problem tanımı
   - Çözüm yaklaşımı
   - Faz breakdown

2. **OPTIMIZATION_REPORT.md**
   - Detaylı performans raporu
   - Test sonuçları
   - Maliyet analizi
   - Teknik iyileştirmeler

3. **MULTI_MATCH_IMPLEMENTATION.md**
   - Multi-match özelliği teknik detaylar
   - API response formatı
   - Frontend entegrasyonu

4. **MULTI_MATCH_TESTING_GUIDE.md**
   - Test senaryoları
   - UI kontrol listesi
   - Sorun giderme

5. **FINAL_OPTIMIZATION_SUMMARY.md**
   - Tüm optimizasyonların özeti
   - ROI hesaplamaları
   - Gelecek öneriler

### Test Scriptleri

1. **test-optimized-search.js**
   - Edge function test
   - 5 senaryo
   - Performance measurement

---

## 🚀 SONRAKİ FAZ: Multi-Tenant Authentication

### Gereksinimler

**Temel İhtiyaçlar:**
1. ✅ Her firma ayrı database (tenant isolation)
2. ✅ Login sistemi (email/password)
3. ✅ Firma kayıt (signup)
4. ✅ Row Level Security (RLS) tenant bazlı
5. ✅ Session management

**Teknik Kararlar:**
- Supabase Auth kullanılacak
- Tenant ID: `company_id` (user metadata)
- Database: Shared schema, RLS ile isolation
- Alternatif: Schema-per-tenant (daha güvenli ama karmaşık)

### Mimari Yaklaşım

**Seçenek 1: Row Level Security (RLS) - ÖNERİLEN**

**Avantajları:**
- ✅ Tek database, kolay yönetim
- ✅ Supabase native desteği
- ✅ Kolay migration
- ✅ Maliyet etkin

**Dezavantajları:**
- ⚠️ RLS policy yönetimi gerekli
- ⚠️ Tüm tablolara tenant_id eklenmeli

**Implementasyon:**
```sql
-- Her tabloya tenant_id ekle
ALTER TABLE products ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE quotations ADD COLUMN company_id UUID; -- Zaten var

-- RLS policy
CREATE POLICY "Users can only see their company's products"
  ON products FOR ALL
  USING (company_id = auth.jwt() ->> 'company_id');
```

**Seçenek 2: Schema-per-Tenant**

**Avantajları:**
- ✅ Tam izolasyon
- ✅ Backup kolay
- ✅ Güvenlik maksimum

**Dezavantajları:**
- ❌ Karmaşık yönetim
- ❌ Migration zor
- ❌ Maliyet yüksek

### Auth Akışı

**1. Signup (Firma Kaydı):**
```
User → Supabase Auth → Create User
                     → Create Company Record
                     → Set company_id in user.metadata
```

**2. Login:**
```
User → Supabase Auth → Verify Credentials
                     → Get company_id from metadata
                     → Set in session
```

**3. API Calls:**
```
Frontend → Supabase Client → Auto-inject company_id
                           → RLS filters by company_id
```

### Değişmesi Gereken Dosyalar

**Database:**
1. `supabase/migrations/20250120_add_multi_tenant.sql`
   - products, quotation_items'a company_id ekle
   - RLS policies oluştur
   - Auth triggers

**Backend:**
- Edge function değişmez (company_id otomatik gelecek)

**Frontend:**
1. `app/login/page.tsx` - Yeni login sayfası
2. `app/signup/page.tsx` - Firma kayıt sayfası
3. `lib/supabase.ts` - Auth helper'lar
4. `middleware.ts` - Route protection
5. Tüm sayfalar → protected routes

**Layout:**
1. `app/layout.tsx` - Auth context provider
2. `components/layout/Header.tsx` - Logout butonu
3. `components/auth/` - Auth komponentleri

### Tahmini Süre

| Görev | Süre | Dosyalar |
|-------|------|----------|
| Database migration | 2 saat | `migrations/*.sql` |
| Auth pages (Login/Signup) | 4 saat | `app/login/`, `app/signup/` |
| Route protection | 2 saat | `middleware.ts` |
| RLS policies | 3 saat | Migration + test |
| Frontend updates | 4 saat | Tüm sayfalar |
| Test & debug | 3 saat | - |
| **TOPLAM** | **2-3 gün** | - |

### Kabul Kriterleri

- [ ] Kullanıcı kayıt olabiliyor
- [ ] Kullanıcı giriş yapabiliyor
- [ ] Her firma sadece kendi verilerini görüyor
- [ ] Logout çalışıyor
- [ ] Protected routes çalışıyor
- [ ] RLS policies test edildi
- [ ] Session management çalışıyor
- [ ] Password reset çalışıyor (bonus)

---

## 🎯 Uzun Vadeli Roadmap

### Faz 10: İskonto Yönetimi
- [ ] İskonto kuralları UI
- [ ] Firma-ürün bazlı iskonto
- [ ] Geçerlilik tarihi kontrolü
- [ ] Otomatik iskonto uygulama

**Dosyalar:**
- `app/discounts/page.tsx` - Yeni
- `components/discounts/` - Yeni
- `discount_rules` tablosu zaten var

### Faz 11: Excel/Email Export
- [ ] Teklif PDF oluşturma
- [ ] Excel export
- [ ] Email template
- [ ] Email gönderimi

**Dosyalar:**
- `lib/pdf-generator.ts` - Yeni
- `lib/email.ts` - Yeni
- `app/api/export/route.ts` - Yeni

### Faz 12: Teklif Yönetimi
- [ ] Teklif listesi filtreleme
- [ ] Durum güncelleme
- [ ] Teklif detay sayfası
- [ ] Arşivleme

**Dosyalar:**
- `app/quotations/[id]/page.tsx` - Yeni
- `components/quotations/QuotationList.tsx` - Geliştirilecek

### Faz 13: Analytics & Raporlama
- [ ] Dashboard istatistikleri
- [ ] Firma performans raporu
- [ ] Ürün satış analizi
- [ ] AI eşleştirme başarı oranı

**Dosyalar:**
- `app/analytics/page.tsx` - Yeni
- `lib/analytics.ts` - Yeni

---

## 🔍 Proje Navigasyonu

### Hızlı Erişim

**Ürün Kataloğu:**
- Görüntüle: `app/products/page.tsx`
- Import: `app/import/page.tsx`
- API: Excel processing → `app/api/import/route.ts`

**Teklif Oluşturma:**
- Ana sayfa: `app/quotations/new/page.tsx`
- Modallar: `components/quotations/*Modal.tsx`
- Görsel: `components/quotations/ImageUploadTab.tsx`

**AI Eşleştirme:**
- Edge function: `supabase/functions/match-product/index.ts`
- Test: `test-optimized-search.js`
- Deployment: Supabase MCP

**Database:**
- Migrations: `supabase/migrations/*.sql`
- Son migration: `20250119_add_search_optimization.sql`

**Dökümanlar:**
- Proje genel: `CLAUDE.md`
- Detaylı plan: `PROJE_PLANLAMA.md` (bu dosya)
- Optimizasyon: `FINAL_OPTIMIZATION_SUMMARY.md`

### Dosya Yapısı Özeti

```
InvoiceGen/
├── app/                    # Next.js pages
│   ├── page.tsx           # Dashboard
│   ├── products/          # Ürün yönetimi
│   ├── companies/         # Firma yönetimi
│   ├── quotations/        # Teklif sistemi
│   │   └── new/           # Yeni teklif (ANA SAYFA)
│   ├── import/            # Excel import
│   └── api/               # API routes
│       └── import/        # Excel processing
├── components/            # React components
│   ├── quotations/        # Teklif komponentleri
│   │   ├── ImageUploadTab.tsx
│   │   ├── ProductSelectionModal.tsx
│   │   └── BatchMultiMatchModal.tsx
│   └── layout/            # Layout komponentleri
├── supabase/
│   ├── functions/         # Edge functions
│   │   └── match-product/ # AI eşleştirme (v8)
│   └── migrations/        # Database migrations
├── lib/                   # Utilities
│   └── supabase.ts       # Supabase client
├── test-optimized-search.js  # Test script
├── CLAUDE.md             # Proje ana döküman
├── PROJE_PLANLAMA.md     # Bu dosya
├── FINAL_OPTIMIZATION_SUMMARY.md
└── .env.local            # Environment variables
```

---

## 📞 Notlar ve İletişim

### Önemli Bilgiler

**Supabase Project:**
- URL: `https://zsmaltekrsnitlekjxad.supabase.co`
- Edge Function v8 deployed
- Database migrations applied

**Development Server:**
- Port: 3001
- URL: http://localhost:3001

**Test için Örnek Talepler:**
- "63-50" → Multi-match (5 ürün)
- "NTG EF 63-50" → Exact match (1 ürün)
- "63-50 servis te" → Full-text (1 ürün)

### Gelecek Geliştirici İçin

1. **Başlarken:**
   - `CLAUDE.md` oku (genel bakış)
   - `PROJE_PLANLAMA.md` oku (bu dosya - detaylar)
   - `npm install && npm run dev`

2. **Auth eklerken:**
   - Bu dosyadaki "Faz 9: Multi-Tenant Auth" bölümünü oku
   - Database migration'ı incele
   - RLS policy örneklerine bak

3. **Yeni özellik eklerken:**
   - İlgili dökümanları kontrol et
   - Mevcut komponentleri yeniden kullan
   - Analytics kaydet (match_analytics gibi)

4. **Bug fix yaparken:**
   - Edge function logs: Supabase dashboard
   - Frontend errors: Browser console
   - Database: Supabase SQL editor

---

**Son Güncelleme:** 2025-01-20
**Sonraki Milestone:** Multi-Tenant Authentication (Faz 9)
**Durum:** ✅ MVP Ready, Auth Bekleniyor
