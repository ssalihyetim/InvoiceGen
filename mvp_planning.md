# MVP Planlama

**Proje Durumu**: MVP tamamlandı ✅ — Production'da, son test aşamasında
**Güncelleme**: 2026-03-08

---

## Tamamlanan Fazlar (1–9 + 11)

- Faz 1: Altyapı ve kurulum
- Faz 2: Veritabanı şeması
- Faz 3: Frontend temel yapı
- Faz 4: Excel import sistemi
- Faz 5: AI ürün eşleştirme (ilk versiyon)
- Faz 7: Teklif oluşturma (3 giriş yöntemi)
  - ✅ Görsel Yükle v1: Tesseract.js OCR → GPT-4o-mini Vision API
    - `app/api/process-image/route.ts` endpoint eklendi
    - Client-side image resize (max 1024px) + düzenlenebilir sonuç tablosu
  - ✅ Görsel Yükle v2: gpt-4o, 2048px çözünürlük, parallel matching, unit sütunu
    - Model: gpt-4o-mini → gpt-4o (yoğun tablo okuma için)
    - Çözünürlük: 1024px → 2048px
    - max_tokens: 1000 → 4000 (80+ satır için)
    - Paralel eşleştirme: sequential for...of → Promise.allSettled
    - Birim sütunu eklendi (düzenlenebilir)
    - "Satır Ekle" butonu eklendi
    - Vercel timeout: 30s → 60s
    - Risk: Görsel kalitesi düşükse gpt-4o da başarısız olabilir — kullanıcıya manuel düzenleme imkânı var
- Faz 8: AI optimizasyonu (10x hız, %99 maliyet düşüşü)
- Görsel Yükle v3: GPT-4o → Gemini 2.5 Flash Lite (ücretsiz), model adı UI'dan kaldırıldı
- Bugfix Sessiyonu 1 (2026-03-05):
  - Excel import: ON CONFLICT hatası düzeltildi (dosya içi duplicate dedup + ignoreDuplicates:true)
  - Excel import: Vercel timeout azaltıldı (fallback tek-tek döngüsü kaldırıldı)
  - Excel import: Mevcut ürünler sessizce atlanıyor (hata vermez)
  - Excel import: Date serial fiyat sorunu düzeltildi (cellDates:true → instanceof Date check)
  - Ürünler sayfası: Sayfa altı count totalCount kullanıyor (products.length yerine)
  - Toplu silme: Tek-tek döngü yerine .in() batch delete (daha hızlı ve güvenilir)
- Bugfix Sessiyonu 2 (2026-03-05):
  - OCR eşleştirme: product_code ayrı alan olarak çıkarıldı; talep = product_code || açıklama → exact match oranı arttı
  - 1000 ürün limiti: Supabase PostgREST server-level max_rows cap → sayfalı yükleme (1000'er batch) eklendi (products + quotations/new)
  - Toplu silme Bad Request: 1000+ UUID → URL too long → /api/bulk-delete-products endpoint (100'er batch) ile çözüldü
- Session 3 (2026-03-06):
  - Toplu İşlemler "Tümüne Uygula": `applyToAll: true` parametresi eklendi (bulk-update + bulk-delete API). DB'den ID fetch edilerek ID gönderilmeden tüm ürünler tek API çağrısıyla güncelleniyor/siliniyor. Products sayfasına "Tüm [N] Ürüne Uygula" paneli eklendi.
  - AI Search limitleri artırıldı: Tüm .limit(10) → .limit(100); AI fallback candidates: 10 → 30
  - Örnek Excel endpoint: `/api/generate-sample-excel` — DB'den 15 rastgele ürün çekip "Müşteri Talebi"+"Miktar" Excel oluşturuyor. Quotations/new sayfasında "Örnek Excel İndir" linki eklendi.
  - Git push → Vercel production auto-deploy
- Faz 9: Multi-Tenant Authentication (2026-03-07):
  - ✅ `app/auth/login/page.tsx` ve `app/auth/signup/page.tsx` oluşturuldu
  - ✅ `middleware.ts` ile route koruması (`/login`, `/auth/**` hariç tüm sayfalar protected)
  - ✅ Tüm tablolara `company_id` migration eklendi
  - ✅ RLS politikaları (products, companies, quotations, quotation_items, import_history)
  - ✅ Supabase Auth → `user.id` ile `company_id` eşleştirmesi
  - ✅ Mevcut sayfalar `company_id` filtrelemesi için güncellendi
  - ✅ Kullanıcı profil/logout UI eklendi
- Bugfix Sessiyonu 4 (2026-03-07):
  - Toplu silme FK hatası (root cause): `match_analytics` tablosunda `matched_product_id` FK constraint CASCADE'siz oluşturulmuştu. Production'da match_analytics verisi var; anon key DELETE izni olmayabilir → silently fail → products delete → FK violation.
  - Çözüm (primer): FK constraint'e `ON DELETE CASCADE` eklendi (Supabase Dashboard SQL ile)
  - Çözüm (sekonder): `bulk-delete-products/route.ts` — match_analytics delete hatasını yakala ve console.error ile logla (artık silently fail yok)
- Bugfix Sessiyonu 5 (2026-03-08):
  - UI yenileme: Sidebar indigo gradient temaya alındı, emojili nav linkleri eklendi (🏠📦🏢📄📤)
  - Dashboard: Kart emojileri, ciro kartı indigo gradient, status badge ring stilleri eklendi
  - Toplu silme "Invalid API key": supabaseAdmin (SUPABASE_SERVICE_ROLE_KEY gerektiren) yaklaşımı geri alındı. DB'de zaten `ON DELETE CASCADE` olduğu için route sadeleştirildi — doğrudan products delete, match_analytics cascade ile otomatik temizleniyor.
- ✅ **Faz 11: Test & İyileştirme (2026-03-08)** — TAMAMLANDI
  - ✅ Hata yönetimi: alert() → toast notification (companies, quotations, products sayfaları)
  - ✅ Loading state: tüm sayfalarda yükleme göstergesi
  - ✅ Boş durum UI: anlamlı mesajlar ve yönlendirici butonlar
  - ✅ UI tutarlılığı: indigo tema sidebar + dashboard
  - ✅ Mobile responsive: tablolarda overflow-x-auto, sidebar mobile menü mevcut
  - ✅ Network error fallback: loadProducts try/catch → toast notification
  - ✅ Performance: 1000'er batch pagination (products + quotations)
  - ✅ Ürünler sayfasına filtreler: "Fiyat Sorunuz" (zeroPriceOnly), para birimi filtresi, aktif filtre sayacı

---

## Kalan Fazlar – Öncelik Sırası

### 🔴 Kritik Yol (MVP için zorunlu)

#### Faz 10 – Export (kısmen tamamlandı)

Tamamlananlar:
- [x] PDF teklif export (`lib/pdf-generator.ts` — jsPDF, TR karakter desteği, firma bilgisi + ürün tablosu + toplamlar)
- [x] PDF indirme butonu teklifler sayfasında (📄 PDF)

Kalan:
- [ ] Excel teklif export (SheetJS) — opsiyonel, PDF yeterli olabilir
- [ ] Email gönderme (Resend veya SendGrid) — opsiyonel MVP sonrası

#### ✅ Faz 12 – Production Deployment — TAMAMLANDI

İş kalemleri:
- [x] Vercel deployment konfigürasyonu (`vercel.json` — import: 60s, process-image: 60s timeout)
- [x] Vercel Dashboard'da GitHub bağlantısı aktif (`ssalihyetim/InvoiceGen` → main branch, auto-deploy)
- [x] Environment variables eklendi: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_API_KEY` (All Environments)
- [x] Supabase RLS güncellendi: `authenticated` rolüne kısıtlandı (eski "public" USING(true) kaldırıldı)
- [ ] Production end-to-end test (login → import → teklif → PDF)
- [ ] Custom domain (opsiyonel)

---

### 🟡 Ticari Hazırlık Fazları (2026-03-15)

#### ✅ Faz 13 — Kritik Bug Fix + Multi-Tenant (2026-03-15)
- [x] **FAZ 0**: Ürün eşleştirme bug fix — ağırlıklı keyword scoring, ürün tipi sözlüğü, isMultiMatch threshold
- [x] **FAZ 1**: Multi-tenant DB — tenants/tenant_users tabloları, tüm tablolara tenant_id, RLS politikaları
- [x] Signup sayfası + tenant oluşturma akışı
- [x] AuthProvider context (user, role, tenantId)

#### ✅ Faz 14 — RBAC (2026-03-15)
- [x] 5 rol: admin, manager, sales, accountant, viewer
- [x] `lib/permissions.ts` — canPerform() + rol matrisi
- [x] `components/PermissionGate.tsx` — UI yetki kontrol wrapper
- [x] `lib/api-auth.ts` — server-side API yetki kontrolü
- [x] `app/settings/users/page.tsx` — kullanıcı yönetim sayfası (admin only)

#### ✅ Faz 15 — Audit Log (2026-03-15)
- [x] audit_logs + quotation_versions tabloları
- [x] DB trigger ile otomatik loglama (products, companies, quotations, quotation_items)
- [x] `app/admin/audit-log/page.tsx` — filtrelenebilir audit log UI
- [x] `components/audit/DiffViewer.tsx` — old vs new diff gösterimi
- [x] `components/companies/ActivityTimeline.tsx` — firma aktivite zaman çizelgesi

#### ✅ Faz 16 — Ticari Dalga 1 (2026-03-15)
- [x] İskonto Yönetimi UI (`app/settings/discounts/page.tsx`) + CRUD
- [x] Teklif geçerlilik süresi (valid_until + expired status + auto-expire fonksiyon)
- [x] PDF özelleştirme (tenant adı, başlık notu, geçerlilik tarihi, şartlar, alt bilgi)
- [x] Dashboard analitik (dönüşüm hunisi + en iyi müşteriler)

#### ✅ Faz 17 — Ticari Dalga 2 (2026-03-15)
- [x] Email otomasyonu (`/api/send-quotation` — Resend SDK, email_logs tablosu)
- [x] Bildirim sistemi (notifications tablosu + auto-trigger on status change)
- [x] Döviz kuru tablosu (exchange_rates — TCMB cache)
- [x] CRM: company_notes + follow_ups tabloları
- [x] Pipeline Kanban sayfası (`app/pipeline/page.tsx`)

---

## Kritik Yol Özeti

```
Faz 1-12: MVP ✅
    ↓
Faz 13 (Bug Fix + Multi-Tenant) ✅
    ↓
Faz 14 (RBAC) ✅
    ↓
Faz 15 (Audit Log) ✅
    ↓
Faz 16 (Ticari Dalga 1) ✅
    ↓
Faz 17 (Ticari Dalga 2) ✅ ← ŞU AN BURADA
    ↓
SONRAKI: DB migration'ları Supabase'e uygula → Production deploy → E2E test
```

---

## Durum Özeti

| Faz | Durum |
|-----|-------|
| Faz 1–5, 7–9 | ✅ Tamamlandı |
| Faz 10 (PDF Export) | ✅ Tamamlandı |
| Faz 11 (Test & İyileştirme) | ✅ Tamamlandı |
| Faz 12 (Deployment) | ✅ Tamamlandı |
| Faz 13 (Bug Fix + Multi-Tenant) | ✅ Tamamlandı |
| Faz 14 (RBAC) | ✅ Tamamlandı |
| Faz 15 (Audit Log) | ✅ Tamamlandı |
| Faz 16 (Ticari Dalga 1) | ✅ Tamamlandı |
| Faz 17 (Ticari Dalga 2) | ✅ Tamamlandı |
| Migration + Deploy + E2E Test | ⏳ Bekliyor |

## Sonraki Adım — Migration & Deploy

1. Supabase Dashboard SQL Editor'da migration'ları sırayla çalıştır:
   - `supabase/migrations/20260315_multi_tenant.sql`
   - `supabase/migrations/20260315_audit_log.sql`
   - `supabase/migrations/20260315_quotation_validity.sql`
   - `supabase/migrations/20260315_commercial_wave2.sql`
2. Vercel'e env var ekle: `RESEND_API_KEY` (email için)
3. Git push → Vercel auto-deploy
4. E2E test:
   - Yeni kayıt → tenant oluşturma
   - Multi-tenant izolasyon (farklı tenant verileri görünmemeli)
   - Rol değiştirme → UI/API erişim kontrolü
   - Audit log kaydı kontrolü
   - Pipeline kanban → durum değiştirme
   - İskonto kuralı oluşturma
   - PDF indirme (tenant adı + geçerlilik tarihi)

## Bugfix Sessiyonu 6 — Görsel Eşleştirme: Tüm Ürünler İlk Ürüne Gidiyordu

**Tarih**: 2026-03-09

### Kök Nedenler ve Düzeltmeler

1. **measurementPattern dedup**: Tek boyutlu ürünler için aynı sayı iki kez geliyordu ("63-63"), sıfır sonuç üretiyordu. Düzeltme: `uniqueNumbers` ile dedup, tek sayıyı doğrudan pattern olarak kullan.
2. **ilike fallback kolonü**: `product_type` yerine `search_text` kullanıldı — MANŞON/VANA/ELEKTROFÜZYİON search_text'te bulunuyor.
3. **AI random-100 bias**: Aday yokken random 100 ürün çekip AI'ye veriyordu → daima DB'deki ilk ürün seçiliyordu. Düzeltme: aday yoksa direkt no-match döndür.
4. **Deploy eksikliği**: Önceki oturumda uygulanan düzeltmeler (scoring, isMultiMatch threshold) deploy edilmemişti — bu seferki deploy ile birlikte tüm düzeltmeler aktif.

## Bugfix Sessiyonu 7 — Gerçek Kök Neden Bulundu: codePattern Regex

**Tarih**: 2026-03-09

### Gerçek Hata

`parseCustomerRequest()` içindeki `codePattern` regex HİÇBİR ZAMAN "NTG-EF-63" formatındaki kodları yakalayamıyordu:
- Eski regex: `/[A-Z]{2,}\s*\d+[-\s]\d+/` — iki sayı arasında ayırıcı gerektiriyor
- "NTG-EF-63" → regex eşleşmez → `productCode = undefined` → exactMatch hiç çalışmaz
- Tüm istekler FTS'e düşüyor, FTS'de yanlış scoring ile hep aynı ürün dönüyor

### Yapılan Düzeltmeler (deploy edildi)

1. **codePattern regex düzeltildi** (ana fix):
   - Yeni: `/\b[A-Z]{2,}(?:[-][A-Z0-9]+)+\b/g`
   - "NTG-EF-63" → yakalar, "NTG-EF-63-50" → yakalar

2. **exactMatch iyileştirildi**:
   - Önce birebir product_code eşleşmesi (wildcard yok) — "NTG-EF-63" aramasının "NTG-EF-63-50"u getirmesini önler
   - Birebir bulunamazsa substring ile ara (tek sonuç varsa kabul et)

3. **Null safety** (search_text için):
   - `product.search_text.toLowerCase()` → `(product.search_text || "").toLowerCase()`
   - Null search_text olan ürünlerde crash olmaz

## Bugfix Sessiyonu 8 — Stop Words Filtre Hatası

**Tarih**: 2026-03-15

### Hata
`parseCustomerRequest()` içindeki `stopWords` dizisi küçük harfle tanımlıydı (`'bir'`, `'ve'` vb.) ama kelimeler zaten `toUpperCase()` ile büyük harfe çevrilmişti. `stopWords.includes(w.toUpperCase())` karşılaştırması hiçbir zaman eşleşmiyordu → stop words filtrelenmiyordu.

### Düzeltme
Stop words dizisi büyük harfe çevrildi: `['BIR', 'VE', 'ILE', 'ICIN', 'ADET', 'METRE', 'KG', 'MM', 'CM', 'LIK']`

