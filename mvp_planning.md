# MVP Planlama

**Proje Durumu**: 8/12 faz tamamlandı (%67) + Görsel Yükle iyileştirmesi + kritik bugfix sessiyonları + Session 3 iyileştirmeleri
**Güncelleme**: 2026-03-06

---

## Tamamlanan Fazlar (1–8)

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

---

## Kalan Fazlar – Öncelik Sırası

### 🔴 Kritik Yol (MVP için zorunlu)

#### Faz 9 – Multi-Tenant Authentication (2–3 gün)
**Neden önce bu?** Birden fazla firma kullanacaksa veri izolasyonu olmazsa olmaz.

İş kalemleri:
- [ ] `app/auth/login/page.tsx` ve `app/auth/signup/page.tsx` oluştur
- [ ] `middleware.ts` ile route koruması (`/login` hariç tüm sayfalar protected)
- [ ] Tüm tablolara `company_id` migration ekle
- [ ] RLS politikaları (products, companies, quotations, quotation_items, import_history)
- [ ] Supabase Auth → `user.id` ile `company_id` eşleştirmesi
- [ ] Mevcut sayfaları `company_id` filtrelemesi için güncelle
- [ ] Kullanıcı profil/logout UI

#### Faz 10 – Export (2 gün)
**Neden ikinci?** Müşteriye teklif gönderebilmek için PDF/Excel export şart.

İş kalemleri:
- [ ] PDF teklif export (jsPDF veya react-pdf)
  - Firma logosu, teklif numarası, ürün tablosu, toplamlar
- [ ] Excel teklif export (SheetJS)
- [ ] Email gönderme (Resend veya SendGrid entegrasyonu)
  - Teklifi PDF olarak müşteri emailine gönder
- [ ] Export butonlarını teklif detay sayfasına ekle

#### Faz 12 – Production Deployment (1 gün)
**Neden üçüncü?** Test ve deployment bir arada yapılabilir.

İş kalemleri:
- [x] Vercel deployment konfigürasyonu (`vercel.json` eklendi — import: 60s, process-image: 60s timeout)
- [ ] Vercel Dashboard'da GitHub bağlantısı kur (`ssalihyetim/InvoiceGen` → main branch)
- [ ] Environment variables (production Supabase URL/key, OpenAI key) → Vercel Dashboard'a ekle
- [ ] Custom domain (opsiyonel)
- [ ] Supabase production RLS politikalarını doğrula

---

### 🟡 Önemli ama MVP sonrası olabilir

#### Faz 11 – Test & İyileştirme (2 gün)
Deployment öncesi veya sonrası yapılabilir.

İş kalemleri:
- [ ] End-to-end test senaryoları (import → teklif → export akışı)
- [ ] Hata yönetimi iyileştirmeleri (boş state, network error)
- [ ] Mobile responsive kontrol
- [ ] Performance profiling (büyük ürün kataloglarında sayfa yükleme)
- [ ] Browser compatibility (Chrome, Firefox, Safari)

#### Faz 6 – İskonto Yönetimi (1–2 gün)
Firma bazlı özel iskonto oranları. MVP sonrası eklenebilir.

İş kalemleri:
- [ ] `discounts` tablosu (company_id, product_type, percentage)
- [ ] Firma yönetimi sayfasına iskonto UI
- [ ] Teklif oluşturmada otomatik iskonto uygulama

---

## Kritik Yol Özeti

```
Faz 9 (Auth)
    ↓
Faz 10 (Export)
    ↓
Faz 12 (Deployment)  ←─── Faz 11 (Test) paralel yapılabilir
    ↓
MVP tamamlandı ✅
    ↓
Faz 6 (İskonto) ─ sonraki iterasyon
```

---

## Risk ve Bağımlılıklar

| Risk | Etki | Azaltma |
|------|------|---------|
| RLS migration mevcut veriyi bozabilir | Yüksek | Önce backup al, staging'de test et |
| PDF library font sorunu (TR karakter) | Orta | jsPDF'te font embedding gerekli |
| Email deliverability | Düşük | Resend'in test modu ile başla |
| Vercel env variable sızıntısı | Yüksek | NEXT_PUBLIC_ prefix kuralını uygula |

---

## Tahmini Toplam Süre

| Faz | Süre |
|-----|------|
| Faz 9 | 2–3 gün |
| Faz 10 | 2 gün |
| Faz 11 | 2 gün |
| Faz 12 | 1 gün |
| **Toplam** | **7–8 gün** |

MVP'ye ulaşmak için yaklaşık 1–2 haftalık çalışma kaldı.
