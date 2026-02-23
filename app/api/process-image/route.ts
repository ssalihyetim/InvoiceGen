import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.startsWith('your_') || apiKey === 'placeholder') {
      return NextResponse.json(
        { error: 'OpenAI API key yapılandırılmamış.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { image } = body

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Görsel verisi gerekli.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `Sen Türk endüstriyel ürün listesi tablolarını analiz eden bir uzmansın.
Görselde tablo varsa her satırı ayrı kalem olarak çıkar.
Ürün kodu varsa mutlaka dahil et (açıklama yanında kod da olsun).
Ürün kodu ve açıklamayı birleştirerek "product" alanına yaz (ör: "PE100 63mm SDR17 HDPE Boru").
Eksik değerleri tahmin etme, sadece görselde olanı yaz.
Başlık satırlarını, toplam satırlarını ve boş satırları atla.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: image },
            },
            {
              type: 'text',
              text: `Tablodaki TÜM ürün satırlarını JSON array olarak çıkar.
Önce tabloda kaç ürün satırı olduğunu say, sonra hepsini listele.
Hiçbir satırı atlama — büyük liste olsa bile tümünü yaz.
Her kalem için:
- product: ürün kodu + açıklaması birlikte (string, Türkçe/teknik)
- quantity: miktar (sayı, belirtilmemişse 1)
- unit: birim (adet/metre/kg/litre/ton/kutu/rulo — belirtilmemişse "adet")

Sadece JSON array döndür, markdown code block veya açıklama ekleme.
Örnek: [{"product":"PE100 63mm SDR17 HDPE Boru","quantity":100,"unit":"metre"}]
Ürün yoksa: []`,
            },
          ],
        },
      ],
    })

    const content = response.choices[0]?.message?.content ?? '[]'
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
            { error: 'GPT yanıtı JSON olarak ayrıştırılamadı.', raw: cleaned },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'GPT yanıtı JSON olarak ayrıştırılamadı.', raw: cleaned },
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
