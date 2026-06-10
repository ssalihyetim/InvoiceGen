import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAuthContext } from '@/lib/api-auth'

// ~10 MB binary ≈ 14M base64 chars. The client resizes to 2048px before
// upload (~300 KB), so this only stops abuse, not legitimate use.
const MAX_IMAGE_CHARS = 14_000_000

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (auth instanceof NextResponse) return auth

  try {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key yapılandırılmamış.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { image } = body

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Görsel verisi gerekli.' }, { status: 400 })
    }

    if (image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: 'Görsel çok büyük (maks. ~10MB).' }, { status: 413 })
    }

    // Base64 data URL'den saf base64 ve mime type ayır
    const matches = image.match(/^data:(.+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: 'Geçersiz görsel formatı.' }, { status: 400 })
    }
    const mimeType = matches[1] as 'image/jpeg' | 'image/png' | 'image/webp'
    const base64Data = matches[2]

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        // @ts-ignore — Gemini 2.5 thinking config
        thinkingConfig: { thinkingBudget: 0 },
      },
    })

    const prompt = `Sen Türk endüstriyel ürün listesi tablolarını analiz eden bir uzmansın.

Tablodaki TÜM ürün satırlarını JSON array olarak çıkar.
Hiçbir satırı atlama — büyük liste olsa bile tümünü yaz.
Başlık satırlarını, toplam satırlarını ve boş satırları atla.

Her kalem için:
- product_code: tablodaki ürün kodu / SKU / referans kodu (KOD, ÜRÜN KODU, REF, MALZEME NO gibi sütunlardan al). Bulunamazsa "" bırak.
- product: ürün açıklaması / ismi (string, Türkçe/teknik)
- quantity: miktar (sayı, belirtilmemişse 1)
- unit: birim (adet/metre/kg/litre/ton/kutu/rulo — belirtilmemişse "adet")

Sadece JSON array döndür, başka hiçbir şey yazma.
Örnek: [{"product_code":"NTG-EF-63","product":"HDPE Elektrofüzyon Ek Parça 63mm","quantity":10,"unit":"adet"}]
Ürün yoksa: []`

    // Retry mekanizması — Gemini 503 "high demand" hatası için
    let result
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ])
        break // Başarılı, döngüden çık
      } catch (retryError: any) {
        console.error(`Gemini attempt ${attempt}/3 failed:`, retryError.message)
        if (attempt === 3) throw retryError
        // 2s, 4s bekle
        await new Promise(resolve => setTimeout(resolve, attempt * 2000))
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'Gemini yanıt vermedi.' }, { status: 503 })
    }

    const content = result.response.text()
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let parsed: { product_code?: string; product: string; quantity: number; unit: string }[] = []
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Fallback: extract JSON array from anywhere in the response
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch {
          return NextResponse.json(
            { error: 'Gemini yanıtı JSON olarak ayrıştırılamadı.', raw: cleaned },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Gemini yanıtı JSON olarak ayrıştırılamadı.', raw: cleaned },
          { status: 500 }
        )
      }
    }

    const requests = parsed.map((item) => {
      const code = item.product_code?.trim() || ''
      const desc = item.product?.trim() || ''
      return {
        talep: desc ? (code ? `${code} ${desc}` : desc) : code,
        miktar: typeof item.quantity === 'number' ? item.quantity : 1,
        birim: item.unit ?? 'adet',
      }
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error('process-image API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
