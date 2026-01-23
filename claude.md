# Otomatik Teklif Oluşturma Sistemi

> **Detaylı Planlama ve Teknik Dokümantasyon**: [`PROJE_PLANLAMA.md`](./PROJE_PLANLAMA.md) dosyasını okuyun.

## 📋 Proje Genel Bakış

Bu proje, Excel'de tutulan binlerce ürün verisini veritabanında saklayarak, müşteri taleplerine göre otomatik teklif oluşturan bir web uygulamasıdır. **Yapay zeka destekli hibrit ürün eşleştirme** (Database + AI fallback) ve firma bazlı iskonto yönetimi ile teklif sürecini otomatikleştirir.

**Mevcut Durum**: ✅ Faz 1-7 Tamamlandı (Temel sistem + AI optimizasyonu çalışıyor)
**Sonraki Adım**: 🔐 Faz 9 - Multi-Tenant Authentication (Her firma için ayrı database izolasyonu)
**Sunucu**: http://localhost:3001

---

## 🎯 Temel Özellikler (Çalışıyor ✅)

### 1. **Ürün Yönetimi**
   - ✅ Excel dosyalarından toplu ürün import
   - ✅ Ürün tipi, çap (opsiyonel), kod, çoklu para birimi (TL/USD/EUR)
   - ✅ CRUD operasyonları
   - **Dosyalar**: `app/products/page.tsx`, `app/import/page.tsx`

### 2. **Firma Yönetimi**
   - ✅ Firma CRUD operasyonları
   - ⏳ İskonto yönetimi (Faz 6 - henüz yapılmadı)
   - **Dosyalar**: `app/companies/page.tsx`

### 3. **AI Destekli Ürün Eşleştirme (10x Optimize Edildi 🚀)**
   - ✅ **3 Aşamalı Hibrit Arama**:
     1. **Exact Match** (ürün kodu/ölçü pattern)
     2. **PostgreSQL Full-Text Search** (tsvector + GIN index)
     3. **OpenAI GPT-4o-mini Fallback** (sadece top 10 ürün)
   - ✅ **Çoklu Eşleşme Desteği**: Belirsiz sorgularda (ör: "63-50" → 5 ürün) kullanıcıya seçim modali
   - ✅ **Batch Multi-Match**: Excel/Görsel toplu yükleme için çoklu seçim desteği
   - ✅ **Performans**: 10x hız artışı (5s → 0.5s), %99 maliyet düşüşü ($70 → $0.30/ay)
   - **Dosyalar**:
     - Backend: `supabase/functions/match-product/index.ts` (v8)
     - Database: `supabase/migrations/20250119_add_search_optimization.sql`
     - Frontend: `components/quotations/ProductSelectionModal.tsx`, `BatchMultiMatchModal.tsx`

### 4. **Teklif Oluşturma (3 Farklı Giriş Yöntemi)**
   - ✅ **AI ile Ara**: Doğal dil sorguları (ör: "1/2 inç boru 50 metre")
   - ✅ **Excel Yükle**: Toplu ürün listesi import
   - ✅ **Görsel Yükle**: Tesseract.js OCR ile görsel okuma
   - ✅ Miktar/iskonto düzenleme, gerçek zamanlı toplam hesaplama
   - ✅ Teklif önizleme ve kaydetme
   - ⏳ Excel/Email export (Faz 10)
   - **Dosyalar**: `app/quotations/new/page.tsx`, `components/quotations/ImageUploadTab.tsx`

---

## 🛠 Teknoloji Stack

### Backend
- **Veritabanı**: Supabase (PostgreSQL 15+)
  - **pgvector**: Vector search desteği (hazır, aktif değil)
  - **tsvector/tsquery**: Full-text search (Türkçe dil desteği)
  - **GIN Index**: Yüksek performanslı text arama
- **Edge Functions**: Deno runtime (Supabase MCP ile deploy)
- **Storage**: Supabase Storage (Excel/görsel dosyaları için)

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 18 + Tailwind CSS 3 + shadcn/ui
- **State**: React Hooks (useState, useEffect)
- **Excel**: xlsx (SheetJS)
- **OCR**: Tesseract.js

### AI & Entegrasyonlar
- **AI**: OpenAI GPT-4o-mini (fallback için, kullanım %10-20)
- **Email**: ⏳ Resend/SendGrid (Faz 10'da eklenecek)
- **PDF**: ⏳ jsPDF/react-pdf (Faz 10'da eklenecek)

---

## 📁 Proje Yapısı (Dosya Rehberi)

```
InvoiceGen/
├── app/                          # Next.js App Router sayfaları
│   ├── page.tsx                  # Dashboard (anasayfa)
│   ├── products/page.tsx         # Ürün listesi ve yönetimi
│   ├── companies/page.tsx        # Firma yönetimi
│   ├── import/page.tsx           # Excel toplu ürün import
│   ├── quotations/
│   │   ├── page.tsx              # Teklif geçmişi listesi
│   │   └── new/page.tsx          # ⭐ YENİ TEKLİF OLUŞTURMA (Ana sayfa)
│   └── layout.tsx                # Ana layout ve navigasyon
│
├── components/                   # React komponentleri
│   ├── quotations/
│   │   ├── ProductSelectionModal.tsx        # ⭐ Tek sorgu çoklu eşleşme modali
│   │   ├── BatchMultiMatchModal.tsx         # ⭐ Toplu çoklu eşleşme modali
│   │   └── ImageUploadTab.tsx               # Görsel yükleme + OCR
│   ├── products/                 # Ürün CRUD komponentleri
│   ├── companies/                # Firma CRUD komponentleri
│   └── ui/                       # shadcn/ui temel komponentler
│
├── supabase/
│   ├── functions/
│   │   └── match-product/
│   │       └── index.ts          # ⭐ AI eşleştirme Edge Function (v8 - Optimize)
│   └── migrations/
│       ├── 20250119_add_search_optimization.sql  # ⭐ Full-text search migration
│       └── add_multi_currency_support.sql        # Çoklu para birimi desteği
│
├── lib/
│   ├── supabase.ts               # Supabase client konfigürasyonu
│   └── database.types.ts         # TypeScript tip tanımları (auto-generated)
│
├── test-optimized-search.js      # ⭐ Backend test scripti (Edge Function)
│
├── PROJE_PLANLAMA.md             # 📘 DETAYLI TEKNİK DOKÜMANTASYON (ANA KAYNAK)
├── CLAUDE.md                     # 📄 Bu dosya (özet)
├── FINAL_OPTIMIZATION_SUMMARY.md # Optimizasyon özet raporu
└── package.json                  # Bağımlılıklar

⭐ = Son optimizasyonda değiştirildi/eklendi
```

### Hangi Dosya Ne İş Yapar?

| Dosya | Açıklama | Kullanım |
|-------|----------|----------|
| **app/quotations/new/page.tsx** | Yeni teklif oluşturma ana sayfası. 3 sekme: AI Ara, Manuel Seç, Görsel Yükle | Kullanıcı buradan teklif oluşturur |
| **components/quotations/ProductSelectionModal.tsx** | Tek sorgu için çoklu ürün seçim modali (ör: "63-50" → 5 ürün) | AI ara sekmesinde belirsiz sorgu olunca açılır |
| **components/quotations/BatchMultiMatchModal.tsx** | Toplu yükleme için çoklu ürün seçim modali | Excel/Görsel yükleme sonrası belirsiz sorgular için açılır |
| **supabase/functions/match-product/index.ts** | Backend AI eşleştirme logic (3 aşamalı arama) | Her ürün sorgusu buradan geçer |
| **supabase/migrations/20250119_add_search_optimization.sql** | Database optimizasyon migration (tsvector, GIN index, analytics) | `supabase db push` ile uygulandı |
| **test-optimized-search.js** | Backend test scripti (Edge Function'ı test eder) | `node test-optimized-search.js` ile çalıştır |
| **PROJE_PLANLAMA.md** | Detaylı teknik dokümantasyon, mimari, test sonuçları, gelecek planları | İlk okuması gereken dosya |

---

## 🗄 Veritabanı Şeması

### Ana Tablolar

| Tablo | Açıklama | Önemli Alanlar |
|-------|----------|----------------|
| **products** | Ürün kataloğu (10,000+ ürün destekler) | `product_type`, `diameter` (nullable), `product_code`, `base_price`, `currency`, **`search_vector`** (tsvector) |
| **companies** | Müşteri firmalar | `name`, `email`, `phone`, `tax_number` |
| **quotations** | Teklifler | `quotation_number` (TEK-2025-0001), `company_id`, `status`, `total_amount` |
| **quotation_items** | Teklif kalemleri | `quotation_id`, `product_id`, `quantity`, `discount_percentage`, **`ai_matched`**, **`original_request`** |
| **match_analytics** | ⭐ Arama performans metrikleri | `strategy` (exact/fulltext/ai), `confidence`, `execution_time`, `tokens_used` |
| **import_history** | Excel import geçmişi | `file_name`, `successful_imports`, `error_log` |

**Özel İndeksler (Optimizasyon için)**:
```sql
CREATE INDEX idx_products_search_vector ON products USING GIN(search_vector);
CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_diameter ON products(diameter);
```

**Detaylı şema**: [`PROJE_PLANLAMA.md`](./PROJE_PLANLAMA.md#database-şeması) dosyasında

---

## 🚀 Geliştirme Fazları (Durum)

| Faz | Durum | Açıklama | Süre |
|-----|-------|----------|------|
| ✅ **Faz 1** | Tamamlandı | Altyapı ve kurulum (Next.js + Supabase) | 1 gün |
| ✅ **Faz 2** | Tamamlandı | Veritabanı şeması ve migrations | 1 gün |
| ✅ **Faz 3** | Tamamlandı | Frontend temel yapı (Dashboard, CRUD) | 2 gün |
| ✅ **Faz 4** | Tamamlandı | Excel import sistemi | 2 gün |
| ✅ **Faz 5** | Tamamlandı | AI ürün eşleştirme (ilk versiyon) | 2 gün |
| ⏳ **Faz 6** | Bekliyor | İskonto yönetimi | 1-2 gün |
| ✅ **Faz 7** | Tamamlandı | Teklif oluşturma sistemi (3 giriş yöntemi) | 3 gün |
| ✅ **Faz 8** | Tamamlandı | AI optimizasyonu (10x hız + %99 maliyet düşüşü) | 1 gün |
| 🔐 **FAZ 9** | **SIRADAKİ** | **Multi-Tenant Authentication** | 2-3 gün |
| ⏳ **Faz 10** | Bekliyor | Excel/Email export | 2 gün |
| ⏳ **Faz 11** | Bekliyor | Test & iyileştirme | 2 gün |
| ⏳ **Faz 12** | Bekliyor | Production deployment (Vercel) | 1 gün |

**Toplam İlerleme**: 8/12 faz tamamlandı (%67)

---

## 🔐 FAZ 9: Multi-Tenant Authentication (SIRADAKİ)

**Amaç**: Her firmaya ayrı kullanıcı hesabı ve veri izolasyonu sağlamak.

**Planlanan Yaklaşım**:
1. **Supabase Auth** kullanarak login/signup sistemi
2. **Row Level Security (RLS)** ile veri izolasyonu:
   ```sql
   -- Her kullanıcı sadece kendi company_id'sine ait verileri görsün
   CREATE POLICY "Users see own company data" ON products
     FOR SELECT USING (company_id = auth.uid_to_company_id());
   ```
3. **User Metadata** ile `company_id` eşleştirme
4. **Middleware** ile route koruması (`/login` hariç tüm sayfalar protected)

**Gerekli İşler**:
- [ ] `auth.users` tablosu ve metadata konfigürasyonu
- [ ] Tüm tablolara `company_id` ekleme (migration)
- [ ] RLS politikaları yazma (tüm tablolar için)
- [ ] Login/Signup sayfaları (`app/auth/login/page.tsx`, `app/auth/signup/page.tsx`)
- [ ] Middleware ile route koruması (`middleware.ts`)
- [ ] Mevcut sayfaları güncelleyerek `company_id` filtreleme

**Detaylı Plan**: [`PROJE_PLANLAMA.md` - Faz 9 bölümü](./PROJE_PLANLAMA.md#faz-9-multi-tenant-authentication-sıradaki)

---

## 📊 Performans Metrikleri (Gerçek Test Sonuçları)

**Faz 8 Optimizasyonu Öncesi vs Sonrası**:

| Metrik | Önce | Sonra | İyileştirme |
|--------|------|-------|-------------|
| **Hız** | 2-5 saniye | 0.1-0.6 saniye | **10x daha hızlı** |
| **Ürün Limiti** | 1,000 | 10,000+ | **10x daha fazla** |
| **Maliyet** | $70/ay | $0.30/ay | **%99 düşüş** |
| **Database Kullanımı** | %20 | %80-90 | **4x artış** |
| **AI Kullanımı** | %100 | %10-20 | **5x azalma** |

**Arama Stratejisi Dağılımı** (100 test sorgusu):
- Exact Match: %40 (0.1s avg)
- Full-Text Search: %45 (0.3s avg)
- AI Fallback: %15 (2s avg)

**Detaylı test sonuçları**: [`FINAL_OPTIMIZATION_SUMMARY.md`](./FINAL_OPTIMIZATION_SUMMARY.md)

---

## 🧪 Test ve Geliştirme

### Backend Test (Edge Function)
```bash
node test-optimized-search.js
```
**Test kapsama**: 5 senaryo (exact match, full-text, pattern, AI fallback, multi-match)

### Frontend Test
```bash
npm run dev  # http://localhost:3001
```
1. `/quotations/new` sayfasına git
2. **AI ile Ara** sekmesinde sorgu yap (ör: "63-50")
3. Çoklu eşleşme modali açılıyorsa ✅

### Önemli Komutlar
```bash
# Geliştirme sunucusu
npm run dev

# Supabase Edge Function deploy
# (Supabase MCP ile otomatik yapılıyor, manual gerek yok)

# Database migration
supabase db push

# TypeScript tipleri oluştur
supabase gen types typescript --local > lib/database.types.ts
```

---

## 📝 Notlar ve Best Practices

### API Maliyetleri (Güncel)
- OpenAI GPT-4o-mini: $0.15 per 1M input tokens ($0.60 per 1M output)
- Her AI fallback: ~200 token (10 ürün + prompt)
- Aylık gerçek maliyet: **$0.30** (1000 teklif/ay, %15 AI kullanımı)

### Performans Hedefleri (Mevcut Durum)
- ✅ Sayfa yükleme: < 1 saniye
- ✅ Excel import (1000 ürün): ~5 saniye
- ✅ AI eşleştirme: 0.1-0.6 saniye (avg 0.3s)
- ✅ Teklif oluşturma: < 2 saniye

### Kod Standartları
- TypeScript strict mode aktif
- ESLint + Prettier konfigüre (henüz pre-commit hook yok)
- Functional components + React Hooks
- Supabase MCP kullanarak deployment

---

## 📚 Önemli Dokümanlar

| Dosya | Açıklama | Okuma Sırası |
|-------|----------|--------------|
| **PROJE_PLANLAMA.md** | 📘 Detaylı teknik dokümantasyon (mimari, kod örnekleri, test sonuçları, gelecek planları) | **1. ÖNCELİK** |
| **CLAUDE.md** | 📄 Bu dosya - Proje özeti ve hızlı referans | 2 |
| **FINAL_OPTIMIZATION_SUMMARY.md** | 📊 Optimizasyon özet raporu (ROI, iş etkisi) | 3 |
| **MULTI_MATCH_IMPLEMENTATION.md** | 🔍 Çoklu eşleşme özelliği teknik detayları | 4 (opsiyonel) |
| **OPTIMIZATION_REPORT.md** | 📈 Performans test raporları | 5 (opsiyonel) |

---

## 🎓 Öğrenme Kaynakları

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [shadcn/ui](https://ui.shadcn.com)
- [OpenAI API](https://platform.openai.com/docs)

---

## 📞 Geliştirme Notları

**Sunucu Bilgileri**:
- Development: http://localhost:3001
- Supabase Project: [URL Supabase Dashboard'dan alınabilir]

**Önemli Değişkenler** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
OPENAI_API_KEY=your_key  # Edge Function için
```

---

**Son Güncelleme**: 2025-01-20
**Mevcut Durum**: ✅ Faz 8 Tamamlandı (AI Optimizasyonu)
**Sonraki Milestone**: 🔐 Faz 9 - Multi-Tenant Authentication
**Proje Başlangıcı**: 2024-01-18
**Geliştirme Süresi**: ~2 hafta (8 fazdan 8'i tamamlandı, 4 faz kaldı)
