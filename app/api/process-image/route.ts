import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
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
      },
    })

    const prompt = `Sen Türk endüstriyel ürün listesi tablolarını analiz eden bir uzmansın.

Tablodaki TÜM ürün satırlarını JSON array olarak çıkar.
Önce tabloda kaç ürün satırı olduğunu say, sonra hepsini listele.
Hiçbir satırı atlama — büyük liste olsa bile tümünü yaz.
Başlık satırlarını, toplam satırlarını ve boş satırları atla.

Ürün kodu varsa mutlaka dahil et (açıklama yanında kod da olsun).
Ürün kodu ve açıklamayı birleştirerek "product" alanına yaz.

Her kalem için:
- product: ürün kodu + açıklaması birlikte (string, Türkçe/teknik)
- quantity: miktar (sayı, belirtilmemişse 1)
- unit: birim (adet/metre/kg/litre/ton/kutu/rulo — belirtilmemişse "adet")

Sadece JSON array döndür, başka hiçbir şey yazma.
Örnek: [{"product":"PE100 63mm SDR17 HDPE Boru","quantity":100,"unit":"metre"}]
Ürün yoksa: []`

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ])

    const content = result.response.text()
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let parsed: { product: string; quantity: number; unit: string }[] = []
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

    const requests = parsed.map((item) => ({
      talep: item.product ?? '',
      miktar: typeof item.quantity === 'number' ? item.quantity : 1,
      birim: item.unit ?? 'adet',
    }))

    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error('process-image API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
