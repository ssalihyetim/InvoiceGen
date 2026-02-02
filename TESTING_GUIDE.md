# Mobil Responsive Test Kılavuzu

## 🚀 Hızlı Başlangıç

### Sunucuyu Başlatma

```bash
npm run dev
```

Tarayıcıda aç: http://localhost:3001

---

## 📱 Chrome DevTools ile Test

### 1. DevTools'u Aç
- Windows/Linux: `F12` veya `Ctrl+Shift+I`
- Mac: `Cmd+Option+I`

### 2. Device Toolbar'ı Aç
- Windows/Linux: `Ctrl+Shift+M`
- Mac: `Cmd+Shift+M`

### 3. Test Edilecek Cihazlar

#### Mobil Telefonlar (< 640px)

**iPhone SE (375×667)** - Minimum genişlik
- Hamburger menü görünür mü?
- Tüm buttonlar tıklanabiliyor mu?
- Yatay scroll yok mu?

**iPhone 12 (390×844)**
- Card view düzgün mü?
- Input'lar rahat yazılıyor mu?

**iPhone 12 Pro Max (428×926)**
- Büyük ekranda layout düzgün mü?

#### Tablet (768px - 1023px)

**iPad (768×1024)**
- Hamburger menü çalışıyor mu?
- Card view mi, table mı görünüyor? (Card olmalı)

**iPad Pro (1024×1366)**
- Desktop geçiş noktası (lg breakpoint)
- Table mı, card mı? (Table olmalı)

#### Desktop (>= 1024px)

**Laptop (1366×768)**
- Fixed sidebar görünür mü?
- Hamburger menü yok mu?
- Tablolar düzgün mü?

**Desktop (1920×1080)**
- Tüm özellikler çalışıyor mu?

---

## ✅ Test Checklist

### Layout (Hamburger Menü)

#### Mobil (< 1024px)
- [ ] Hamburger butonu üst sağda görünüyor
- [ ] Hamburger'a tıklayınca menü açılıyor
- [ ] Menü slide-in animasyonu smooth
- [ ] Overlay (yarı saydam arka plan) görünüyor
- [ ] Overlay'e tıklayınca menü kapanıyor
- [ ] Menü linklerine tıklayınca menü kapanıyor
- [ ] Kapatma (X) butonu çalışıyor

#### Desktop (>= 1024px)
- [ ] Fixed sidebar her zaman görünür
- [ ] Hamburger butonu YOK
- [ ] Overlay YOK
- [ ] Eski davranış korunmuş

---

### Firma Seçimi

#### Mobil
- [ ] Dropdown tam genişlik (w-full)
- [ ] Yükseklik >= 44px
- [ ] Rahat tıklanıyor

#### Desktop
- [ ] Dropdown çalışıyor
- [ ] Seçim yapılabiliyor

---

### Tab Butonları (AI / Manuel / Görsel)

#### Mobil (< 640px)
- [ ] Kısa etiketler: "🤖 AI", "📋 Manuel", "📷 Görsel"
- [ ] Horizontal scroll çalışıyor (3 buton sığmazsa)
- [ ] Her buton >= 44px yükseklik
- [ ] Active state (mavi arka plan) görünüyor

#### Desktop (>= 640px)
- [ ] Uzun etiketler: "🤖 AI ile Ara", "📋 Manuel Seç", "📷 Görsel Yükle"
- [ ] Yan yana fit oluyor

---

### AI Arama

#### Mobil (< 640px)
- [ ] Input ve buton ALT ALTA (flex-col)
- [ ] Input tam genişlik
- [ ] Buton tam genişlik
- [ ] Input height >= 44px
- [ ] Buton height >= 44px
- [ ] Font size 16px (zoom olmamalı)

#### Desktop (>= 640px)
- [ ] Input ve buton YAN YANA (flex-row)
- [ ] Buton width: auto (min 120px)

---

### Manuel Ürün Seçimi

#### Mobil (< 1024px)
- [ ] CARD VIEW görünüyor
- [ ] Tablo GİZLİ
- [ ] Her card:
  - [ ] Ürün adı görünür
  - [ ] Ürün kodu görünür
  - [ ] Çap görünür (varsa)
  - [ ] Fiyat görünür
  - [ ] "Ekle" butonu >= 44x44px
  - [ ] "Ekle" butonu sağda

#### Desktop (>= 1024px)
- [ ] TABLO görünüyor
- [ ] Cardlar GİZLİ
- [ ] 5 sütun: Kod, Tip, Çap, Fiyat, Ekle
- [ ] Hover effect çalışıyor

---

### Teklif Kalemleri (En Kritik)

#### Mobil (< 1024px)
- [ ] CARD VIEW görünüyor
- [ ] Tablo GİZLİ
- [ ] Her card:
  - [ ] **Başlık Bölümü**:
    - [ ] Ürün adı + çap görünür
    - [ ] Ürün kodu görünür (font-mono)
    - [ ] "AI Eşleşti" badge görünür (varsa)
    - [ ] Sil butonu (✕) sağ üstte
    - [ ] Sil butonu >= 44x44px
  - [ ] **Fiyat Grid (2 sütun)**:
    - [ ] Sol: "Birim Fiyat" + değer
    - [ ] Sağ: "Toplam" + değer (mavi renk)
    - [ ] Fiyat uyarısı görünür (varsa)
  - [ ] **Input Grid (2 sütun)**:
    - [ ] Sol: "Miktar" input (tam genişlik)
    - [ ] Sağ: "İskonto %" input (tam genişlik)
    - [ ] Her input >= 44px yükseklik
    - [ ] Font size 16px (zoom olmamalı)
- [ ] Yatay scroll YOK

#### Desktop (>= 1024px)
- [ ] TABLO görünüyor
- [ ] Cardlar GİZLİ
- [ ] 7 sütun görünür
- [ ] Compact view

---

### Toplamlar Bölümü

#### Mobil (< 640px)
- [ ] Toplam kartları tam genişlik (w-full)
- [ ] Her para birimi ayrı kart
- [ ] Padding ve boşluklar uygun

#### Desktop (>= 640px)
- [ ] Toplam kartları sabit genişlik (w-96)
- [ ] Sağa hizalı

---

### Kaydet Butonu

#### Mobil (< 640px)
- [ ] Tam genişlik (w-full)
- [ ] Yükseklik >= 56px (extra prominent)
- [ ] Font size 18px (text-lg)
- [ ] Emoji iconlar görünür (⏳ / ✓)
- [ ] Shadow var
- [ ] Kolay tıklanıyor

#### Desktop (>= 640px)
- [ ] Auto width (px-8)
- [ ] Aynı stil korunmuş

---

## 🎨 Görsel Kontroller

### Animasyonlar
- [ ] Sidebar slide-in smooth (300ms)
- [ ] Overlay fade-in smooth
- [ ] Button hover effects çalışıyor
- [ ] Button active states (basılı tutunca) çalışıyor

### Renk ve Tipografi
- [ ] Mavi vurgu (blue-600) tutarlı
- [ ] Kırmızı sil butonu görünür
- [ ] Yeşil kaydet butonu prominent
- [ ] Font-mono kod alanlarında kullanılmış
- [ ] Font size'lar mobilde 16px minimum

### Spacing
- [ ] Kartlar arası boşluk (space-y-4) uygun
- [ ] Padding'ler responsive (p-4 sm:p-6 lg:p-8)
- [ ] Grid gap'ler (gap-3) uygun

---

## 🐛 Bilinen Sorunlar / Edge Case'ler

### Sorun Yok ✅
Şu ana kadar bilinen kritik sorun bulunmamaktadır.

### Test Edilmesi Gereken Edge Case'ler

1. **10+ Ürün Ekleme**
   - [ ] Scroll düzgün çalışıyor mu?
   - [ ] Performance sorunu var mı?

2. **Uzun Ürün Adları**
   - [ ] Truncate çalışıyor mu?
   - [ ] Overflow yok mu?

3. **Çok Büyük Miktarlar** (999999)
   - [ ] Input genişliği yeterli mi?
   - [ ] Layout bozuluyor mu?

4. **Çoklu Para Birimi** (TL + USD + EUR)
   - [ ] Her birim ayrı kart mı?
   - [ ] Toplam hesaplamalar doğru mu?

5. **Yavaş İnternet**
   - [ ] Loading states görünür mü?
   - [ ] UI donmuyor mu?

---

## 📊 Performance Test

### Sayfa Yükleme
```bash
Chrome DevTools > Network
- Disable cache
- Fast 3G simülasyonu
- Refresh page
- FCP < 2s olmalı
- TTI < 3s olmalı
```

### Layout Shift
```bash
Chrome DevTools > Performance
- Record page load
- CLS score < 0.1 olmalı
```

---

## 🎯 Kritik Senaryolar (End-to-End)

### Senaryo 1: Mobilde Tek Ürün Teklif
1. [ ] iPhone SE seç (375px)
2. [ ] Hamburger menü ile "Teklifler" → "Yeni Teklif"
3. [ ] Firma seç (dropdown çalışmalı)
4. [ ] AI ile ara: "1/2 inç boru"
5. [ ] Ürün eklenmeli (card view)
6. [ ] Miktar değiştir (44px input)
7. [ ] Kaydet (56px button)
8. [ ] Başarı mesajı görünmeli

### Senaryo 2: Mobilde Manuel Çoklu Ürün
1. [ ] iPad seç (768px)
2. [ ] "Manuel Seç" sekmesi
3. [ ] Ürün ara (search input)
4. [ ] Card view'dan 3 ürün ekle
5. [ ] Teklif kalemlerinde 3 card görünmeli
6. [ ] Her birinde miktar/iskonto değiştir
7. [ ] Toplamlar doğru hesaplanmalı
8. [ ] Kaydet

### Senaryo 3: Desktop'ta Tablo View
1. [ ] Desktop seç (1920px)
2. [ ] Sidebar görünür olmalı
3. [ ] Manuel seç → Tablo görünmeli
4. [ ] Teklif kalemleri → Tablo görünmeli
5. [ ] Tüm sütunlar görünür
6. [ ] Kaydet

---

## 🔧 Troubleshooting

### Problem: Hamburger menü çalışmıyor
**Çözüm**:
- Console'da hata var mı kontrol et
- useState import edilmiş mi?
- 'use client' directive var mı?

### Problem: Cardlar mobilde görünmüyor
**Çözüm**:
- `lg:hidden` sınıfı var mı?
- `hidden lg:block` tablo için var mı?
- Breakpoint (1024px) doğru mu?

### Problem: Input'lar çok küçük
**Çözüm**:
- `min-h-[44px]` var mı?
- `text-base` (16px) var mı?
- `py-3` padding var mı?

### Problem: Yatay scroll var
**Çözüm**:
- `overflow-x-auto` gereksiz yerde kullanılmış mı?
- Fixed width (w-20, w-16) mobilde kullanılmış mı?
- `w-full` olmalı mobilde

---

## ✅ Test Sonucu Raporu

### Tarih: ___________
### Test Eden: ___________

| Cihaz | Durum | Notlar |
|-------|-------|--------|
| iPhone SE (375px) | ⬜ Pass / ⬜ Fail | |
| iPhone 12 (390px) | ⬜ Pass / ⬜ Fail | |
| iPad (768px) | ⬜ Pass / ⬜ Fail | |
| iPad Pro (1024px) | ⬜ Pass / ⬜ Fail | |
| Desktop (1920px) | ⬜ Pass / ⬜ Fail | |

### Kritik Sorunlar
- [ ] Layout bozuk
- [ ] Touch target < 44px
- [ ] Yatay scroll var
- [ ] Animasyon bozuk
- [ ] Fonksiyon çalışmıyor

### Minor Sorunlar
- [ ] Renk tutarsızlığı
- [ ] Spacing sorunu
- [ ] Font size küçük
- [ ] Hover effect yok

### Genel Değerlendirme
⬜ Production Ready
⬜ Minor Fix Gerekli
⬜ Major Fix Gerekli

---

## 📞 Yardım

Sorun bildirmek için:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Doküman: `MOBILE_RESPONSIVE_IMPLEMENTATION.md`

---

**Test Kılavuzu v1.0**
**Tarih**: 2026-01-29
