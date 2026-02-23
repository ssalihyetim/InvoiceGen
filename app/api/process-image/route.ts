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
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'Sen bir Türk endüstriyel ürün sipariş formu analistisin. Görseldeki ürün taleplerini JSON formatında çıkar.',
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
              text: `Bu görseldeki ürün taleplerini analiz et. Her kalem için:
- product: ürün adı veya kodu (string, Türkçe)
- quantity: miktar (sayı, belirtilmemişse 1)
- unit: birim (adet/metre/kg/litre/ton/kutu - belirtilmemişse "adet")

Sadece JSON array döndür, markdown code block kullanma.
Örnek: [{"product":"63mm PE Boru","quantity":50,"unit":"metre"}]
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
      return NextResponse.json(
        { error: 'GPT yanıtı JSON olarak ayrıştırılamadı.', raw: cleaned },
        { status: 500 }
      )
    }

    const requests = parsed.map((item) => ({
      talep: item.product ?? '',
      miktar: typeof item.quantity === 'number' ? item.quantity : 1,
    }))

    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error('process-image API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
