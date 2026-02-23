# MVP Planlama

**Proje Durumu**: 8/12 faz tamamlandı (%67) + Görsel Yükle iyileştirmesi
**Güncelleme**: 2026-02-23

---

## Tamamlanan Fazlar (1–8)

- Faz 1: Altyapı ve kurulum
- Faz 2: Veritabanı şeması
- Faz 3: Frontend temel yapı
- Faz 4: Excel import sistemi
- Faz 5: AI ürün eşleştirme (ilk versiyon)
- Faz 7: Teklif oluşturma (3 giriş yöntemi)
  - ✅ Görsel Yükle iyileştirmesi: Tesseract.js OCR → GPT-4o-mini Vision API
    - `app/api/process-image/route.ts` endpoint eklendi
    - Client-side image resize (max 1024px) + düzenlenebilir sonuç tablosu
- Faz 8: AI optimizasyonu (10x hız, %99 maliyet düşüşü)

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
- [x] Vercel deployment konfigürasyonu (`vercel.json` eklendi — import: 60s, process-image: 30s timeout)
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
