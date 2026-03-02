# OCR / Vision Model Durum Raporu
> Tarih: 2026-03-02

## Mevcut Durum

**Kullanılan Model: Google Gemini 2.5 Flash Lite** (`gemini-2.5-flash-lite`)

| Katman | Dosya | Model | Durum |
|--------|-------|-------|-------|
| Backend API | `app/api/process-image/route.ts` | `gemini-2.5-flash-lite` | ✅ Doğru |
| Frontend UI metni | `components/quotations/ImageUploadTab.tsx:295` | "GPT-4o Vision" yazıyor | ⚠️ Eski metin — güncellenmemiş |

## Model Tarihi (Commit Sırası)

```
1. GPT-4o (OpenAI)          — başlangıç, ücretli
2. Gemini 2.0 Flash         — ücretsiz alternatif
3. Gemini 2.5 Flash Lite    — şu an aktif, ücretsiz tier
```

## Teknik Detaylar (Backend)

```ts
// app/api/process-image/route.ts
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 8192,
  },
})
```

- **SDK:** `@google/generative-ai`
- **API Key ENV:** `GOOGLE_API_KEY`
- **Görev:** Görsel → Türkçe ürün listesi (JSON array)
- **Görsel ön işleme:** Client-side canvas resize → max 2048px, JPEG %85 kalite

## Bilinen Sorun

`ImageUploadTab.tsx:295` satırında UI hâlâ **"GPT-4o Vision"** yazıyor. Kullanıcıya yanlış bilgi gösteriyor. Düzeltilmesi gerekiyor:

```diff
- GPT-4o Vision ile otomatik ürün ve miktar tespiti. 5-15 saniye sürebilir.
+ Gemini 2.5 Flash ile otomatik ürün ve miktar tespiti. 5-15 saniye sürebilir.
```
