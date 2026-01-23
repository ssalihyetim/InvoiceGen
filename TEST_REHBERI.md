# Test Rehberi - Otomatik Teklif Sistemi

## 📋 Hazırlanan Test Dosyaları

### 1. `urunler_ornegi.xlsx` - 30 Ürün
Farklı kategorilerde ürünler:
- 5 Boru (1/2" - 2")
- 5 Vana (1/2" - 2")
- 5 Dirsek (1/2" - 2")
- 5 Te (1/2" - 2")
- 5 Manşon (1/2" - 2")
- 5 Rekor (1/2" - 2")

### 2. `teklif_talepleri.xlsx` - 5 Teklif Talebi
Gerçekçi müşteri talepleri:
1. "1/2 inç plastik boru 50 metre"
2. "Bir inçlik küresel vana 12 adet"
3. "3/4 inç 90 derece dirsek 25 tane"
4. "İki inç T bağlantı 8 adet"
5. "1.5 inçlik manşon 30 adet gerekiyor"

## 🧪 Test Adımları

### ADIM 1: Uygulamayı Başlat
```bash
npm run dev
```
Tarayıcıda: http://localhost:3000

---

### ADIM 2: Firma Ekle

1. **Firmalar sayfasına git**: http://localhost:3000/companies
2. **"+ Yeni Firma"** butonuna tıkla
3. **Firma bilgilerini gir**:
   - Firma Adı: `Acme İnşaat A.Ş.`
   - Email: `info@acme.com`
   - Telefon: `0212 555 1234`
   - Vergi No: `1234567890`
4. **"Kaydet"** butonuna tıkla

✅ **Beklenen Sonuç**: Firma listesinde görünmeli

---

### ADIM 3: Ürünleri İçeri Aktar (Excel)

1. **Import sayfasına git**: http://localhost:3000/import
2. **"Dosya Yükle"** alanına `urunler_ornegi.xlsx` dosyasını sürükle/seç
3. **Önizlemeyi kontrol et**: İlk 10 satır görünmeli
   - Ürün Tipi: Boru, Vana, Dirsek vb.
   - Çap: 1/2", 3/4", 1" vb.
   - Ürün Kodu: BR-001, VN-001 vb.
   - Fiyatlar: 125.50, 85.50 vb.
4. **"İçeri Aktar"** butonuna tıkla
5. **Bekle** (2-5 saniye)

✅ **Beklenen Sonuç**:
- "Başarılı: 30"
- "Başarısız: 0"

---

### ADIM 4: Ürünleri Kontrol Et

1. **Ürünler sayfasına git**: http://localhost:3000/products
2. **Toplam 30 ürün** görünmeli
3. **Arama fonksiyonunu test et**:
   - "boru" yaz → 5 ürün
   - "1/2" yaz → 6 ürün (her kategoriden 1/2")
   - "VN-" yaz → 5 vana

✅ **Beklenen Sonuç**: Arama doğru çalışıyor

---

### ADIM 5: Teklif Oluştur (AI ile)

1. **Yeni Teklif sayfasına git**: http://localhost:3000/quotations/new
2. **Firma Seç**: "Acme İnşaat A.Ş." seç
3. **AI ile Ürün Ara** (5 teklif talebi):

#### Talep 1: "1/2 inç plastik boru 50 metre"
- Arama kutusuna yaz
- **"AI ile Bul"** butonuna tıkla
- ✅ Beklenen: BR-001 (PVC Boru 1/2") eklenmeli
- Miktar: `50` yap
- İskonto: `10` (örnek %10 iskonto)

#### Talep 2: "Bir inçlik küresel vana 12 adet"
- Tekrar ara: "Bir inçlik küresel vana"
- **"AI ile Bul"** tıkla
- ✅ Beklenen: VN-003 (Küresel Vana 1") eklenmeli
- Miktar: `12`
- İskonto: `5`

#### Talep 3: "3/4 inç 90 derece dirsek 25 tane"
- Ara: "3/4 inç 90 derece dirsek"
- **"AI ile Bul"** tıkla
- ✅ Beklenen: DR-002 (90° Dirsek 3/4") eklenmeli
- Miktar: `25`
- İskonto: `15`

#### Talep 4: "İki inç T bağlantı 8 adet"
- Ara: "İki inç T bağlantı"
- **"AI ile Bul"** tıkla
- ✅ Beklenen: TE-005 (T Bağlantı 2") eklenmeli
- Miktar: `8`
- İskonto: `8`

#### Talep 5: "1.5 inçlik manşon 30 adet"
- Ara: "1.5 inçlik manşon"
- **"AI ile Bul"** tıkla
- ✅ Beklenen: MN-004 (Manşon 1.5") eklenmeli
- Miktar: `30`
- İskonto: `12`

4. **Toplamları Kontrol Et**:
   - Tablo altında ara toplam, iskonto ve genel toplam görünmeli
   - Her ürün yanında yeşil **"AI"** badge'i olmalı

5. **"Teklifi Kaydet"** butonuna tıkla

✅ **Beklenen Sonuç**:
- "Teklif başarıyla oluşturuldu! Teklif No: TEK-2025-0001"
- Form temizlenmeli

---

### ADIM 6: Teklifi Kontrol Et

1. **Teklifler sayfasına git**: http://localhost:3000/quotations
2. **Yeni teklif görünmeli**:
   - Teklif No: TEK-2025-0001
   - Firma: Acme İnşaat A.Ş.
   - Durum: Taslak (gri badge)
   - Tutar: Hesaplanan toplam
   - Tarih: Bugünün tarihi

✅ **Beklenen Sonuç**: Teklif listede görünüyor

---

## 🎯 Beklenen Hesaplamalar

### Örnek Teklif Hesaplaması:

| Ürün | Kod | Birim Fiyat | Miktar | Ara Toplam | İskonto % | İskonto TL | Net Toplam |
|------|-----|-------------|--------|------------|-----------|------------|------------|
| Boru 1/2" | BR-001 | 125.50 | 50 | 6,275.00 | 10% | 627.50 | 5,647.50 |
| Vana 1" | VN-003 | 165.75 | 12 | 1,989.00 | 5% | 99.45 | 1,889.55 |
| Dirsek 3/4" | DR-002 | 18.75 | 25 | 468.75 | 15% | 70.31 | 398.44 |
| Te 2" | TE-005 | 55.50 | 8 | 444.00 | 8% | 35.52 | 408.48 |
| Manşon 1.5" | MN-004 | 24.00 | 30 | 720.00 | 12% | 86.40 | 633.60 |

**TOPLAM**:
- Ara Toplam: 9,896.75 ₺
- Toplam İskonto: 919.18 ₺
- **GENEL TOPLAM: 8,977.57 ₺**

---

## 🔍 AI Eşleştirme Testi

AI sisteminin doğru çalıştığını test etmek için:

### Test Senaryoları:

**1. Açık Talep** (Kolay)
- Talep: "1/2 inç boru"
- ✅ Beklenen: BR-001 (yüksek güven skoru)

**2. Doğal Dil** (Orta)
- Talep: "Yarım inçlik plastik boru lazım"
- ✅ Beklenen: BR-001 (AI "yarım inç" = "1/2"" anlamalı)

**3. Farklı İfadeler** (Zor)
- Talep: "Küresel tip vana bir buçuk inç"
- ✅ Beklenen: VN-004 (Küresel Vana 1.5")

**4. Bulunamayan Ürün** (Negatif Test)
- Talep: "5 inç fiber optik kablo"
- ✅ Beklenen: "Uygun ürün bulunamadı" mesajı

---

## 📊 Veritabanı Kontrol

Supabase Dashboard'dan kontrol etmek için:

1. https://supabase.com/dashboard
2. Projenizi açın
3. **Table Editor** → `products` → 30 satır olmalı
4. **Table Editor** → `companies` → 1 satır (Acme)
5. **Table Editor** → `quotations` → 1 satır (TEK-2025-0001)
6. **Table Editor** → `quotation_items` → 5 satır (her ürün için)

---

## 🐛 Hata Durumları

### Excel Import Hataları:
- **Duplicate kod**: Otomatik update yapılmalı
- **Eksik alan**: Failed count artmalı
- **Yanlış format**: Önizlemede görülmeli

### AI Eşleştirme Hataları:
- **API key yok**: Basit string matching kullanılmalı
- **Ürün bulunamadı**: Alert mesajı
- **Timeout**: "Arama hatası" mesajı

### Teklif Kaydetme Hataları:
- **Firma seçilmemiş**: Alert mesajı
- **Ürün eklenmemiş**: Alert mesajı
- **Negatif miktar**: Input minimum 0.01

---

## ✅ Test Checklist

- [ ] Firma eklendi
- [ ] 30 ürün Excel'den içeri aktarıldı
- [ ] Ürünler listede görünüyor
- [ ] Arama fonksiyonu çalışıyor
- [ ] AI 5 teklif talebini doğru eşleştirdi
- [ ] Her ürün yanında "AI" badge'i var
- [ ] Toplam hesaplama doğru
- [ ] Teklif başarıyla kaydedildi
- [ ] Teklif numarası otomatik oluştu (TEK-2025-0001)
- [ ] Teklif listede görünüyor

---

## 🚀 Sonraki Adımlar

Test başarılı olduysa:
1. ✅ İskonto kuralları ekle (firma bazlı otomatik iskonto)
2. ✅ Excel export (Teklifi Excel'e dönüştür)
3. ✅ Email gönderimi
4. ✅ Dashboard istatistikleri (gerçek veriler)
5. ✅ PDF oluşturma

---

## 💡 İpuçları

- **OpenAI çalışmazsa**: Basit string matching devreye girer, yine de çalışır
- **Yavaş eşleştirme**: İlk API çağrısı 3-5 saniye sürebilir
- **Hata logları**: Browser Console'u açık tutun (F12)
- **Veritabanı**: Supabase Dashboard'dan canlı veri izleyin

---

**Test başarıyla tamamlandığında bu dosyayı güncelleyin!**
