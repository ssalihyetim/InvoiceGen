# InvoiceGen — İlk Kurulum Notu (ARŞİV)

> **ARŞİV — 2026-01-29 tarihli ilk kurulum snapshot'ı. Güncel değildir.**
> Hassas bilgiler (anon key, proje ID, dashboard URL'leri) redakte edilmiştir.
> Güncel kurulum/çalıştırma bilgisi için `mvp_planning.md` ve `TEST_REHBERI.md`'ye bakın.
>
> ⚠️ Bu dosyadaki bazı bilgiler artık yanlış:
> - OCR/AI matching için **OpenAI değil Google Gemini** kullanılıyor (`GOOGLE_API_KEY`).
>   OpenAI yalnızca edge function'da opsiyonel fallback.
> - Dev sunucu portu projede **3001** (bu eski not 3000 diyor).
> - Auth/RLS (Faz 9) o tarihten sonra **tamamlandı** — artık "gelecek" değil.

## Tarihsel Kurulum Özeti (2026-01-29)

- Repo klonlandı, npm paketleri kuruldu.
- Supabase projesi oluşturuldu (proje ID **[REDACTED]**, region eu-west-1, free tier).
- Tüm migration'lar uygulandı (base schema + search optimization).
- `excel-imports` storage bucket oluşturuldu.
- **`match-product` edge function deploy edildi** — AI ürün eşleştirme için.
  (NOT: Sonraki bugfix oturumlarındaki eşleştirme düzeltmeleri yeniden deploy gerektirir.)
- `.env.local` Supabase kimlik bilgileriyle oluşturuldu (anon key **[REDACTED]**).

## Tarihsel İlk Adımlar

1. Firma ekle → 2. `urunler_ornegi.xlsx` ile ürün import et →
3. Teklif oluştur (AI arama / Excel / görsel OCR).

## Güvenlik Notu

- `.env.local` asla versiyon kontrolüne commit edilmez.
- Anon key client-side için güvenlidir; servis rol anahtarı yalnızca sunucu tarafında.
- Row-Level Security uygulandı (bkz. `supabase-rls-policies.sql`, `middleware.ts`, `lib/permissions.ts`).
