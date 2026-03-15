import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// FAZ 2: Akıllı Parsing + 3 Aşamalı Arama
// FAZ 0 Fix: Ağırlıklı keyword scoring + ürün tipi sözlüğü
// ============================================

// Ürün tipi sözlüğü — bu kelimeler ürün tipini belirler, yüksek ağırlık alır
const PRODUCT_TYPE_TERMS: Record<string, string[]> = {
  'MANŞON': ['MANSON', 'MANŞON', 'MANSION'],
  'DİRSEK': ['DIRSEK', 'DİRSEK'],
  'REDÜKSİYON': ['REDUKSIYON', 'REDÜKSİYON', 'REDUKSI'],
  'TE': ['TE', 'TEE'],
  'VANA': ['VANA'],
  'KELEPÇE': ['KELEPCE', 'KELEPÇE'],
  'FLANŞ': ['FLANS', 'FLANŞ', 'FLANJ'],
  'ADAPTÖR': ['ADAPTOR', 'ADAPTÖR', 'ADAPTER'],
  'KÖRTAPA': ['KORTAPA', 'KÖRTAPA', 'KÖR TAPA'],
  'ELEKTROFÜZYİON': ['ELEKTROFUZYON', 'ELEKTROFÜZYİON', 'ELEKTROFÜZYON', 'EF'],
  'ALIN KAYNAK': ['ALIN', 'ALINKAYNAK', 'ALIN KAYNAK'],
  'BORU': ['BORU'],
  'EK PARÇA': ['EK PARCA', 'EK PARÇA', 'EKPARCA'],
  'SEMER': ['SEMER'],
  'İNEGAL': ['INEGAL', 'İNEGAL'],
  'EŞIT': ['ESIT', 'EŞIT', 'EŞİT'],
  'KAPLIN': ['KAPLIN', 'KAPLİN'],
  'RAKOR': ['RAKOR'],
}

// Tüm ürün tipi kelimelerinin flat listesi (hızlı lookup için)
const ALL_TYPE_TERMS = new Set<string>()
for (const variants of Object.values(PRODUCT_TYPE_TERMS)) {
  for (const v of variants) ALL_TYPE_TERMS.add(v)
}

// Malzeme terimleri — orta ağırlık
const MATERIAL_TERMS = new Set([
  'HDPE', 'PE', 'PE100', 'PE80', 'PP', 'PPR', 'PVC', 'PPRC',
  'PN10', 'PN16', 'PN20', 'PN25', 'SDR11', 'SDR17', 'SDR26',
])

interface ParsedRequest {
  originalRequest: string
  productCode?: string      // Tespit edilen ürün kodu
  numbers: string[]         // Çıkarılan sayılar (örn: ["63", "50"])
  keywords: string[]        // Temizlenmiş kelimeler
  productTypeKeywords: string[]  // Ürün tipini belirleyen kelimeler (yüksek ağırlık)
  materialKeywords: string[]     // Malzeme terimleri (orta ağırlık)
  measurementPattern?: string  // Örn: "63-50"
}

interface MatchResult {
  product_id: string
  product: any
  confidence: number
  strategy: 'exact' | 'fulltext' | 'vector' | 'ai'
  reasoning: string
  execution_time?: number
}

// Parsing: Müşteri talebini analiz et
function parseCustomerRequest(request: string): ParsedRequest {
  const originalRequest = request
  const normalized = request.toUpperCase().trim()

  // 1. Sayıları çıkar (63, 50, 125, vs)
  const numberMatches = request.match(/\d+/g) || []
  const numbers = numberMatches.map(n => n.trim())

  // 2. Ürün kodu tespiti (NTG-EF-63, NTG-EF-63-50 gibi)
  // Eski regex [A-Z]{2,}\s*\d+[-\s]\d+ sadece "iki sayılı" kodları yakalıyordu (NTG-EF-63 kaçıyordu!)
  // Yeni regex: tire ile ayrılmış harf+rakam dizileri (NTG-EF-63, NTG-EF-63-50, AB-CD-12 vb.)
  const codeMatches = normalized.match(/\b[A-Z]{2,}(?:[-][A-Z0-9]+)+\b/g)
  const productCode = codeMatches?.[0]

  // 3. Ölçü pattern'i bul (63-50, 125-40 gibi)
  let measurementPattern: string | undefined
  const uniqueNumbers = [...new Set(numbers)]
  if (uniqueNumbers.length >= 2) {
    // İlk iki benzersiz sayıyı birleştir (tekrarlanan sayıları önle: "63-63" → "63")
    measurementPattern = `${uniqueNumbers[0]}-${uniqueNumbers[1]}`
  } else if (uniqueNumbers.length === 1) {
    // Tek boyutlu ürünler: "63mm manşon" → pattern = "63" (geniş arama, keyword scoring ayırır)
    measurementPattern = uniqueNumbers[0]
  }

  // 4. Anahtar kelimeleri çıkar (stop words hariç, sayılar hariç)
  const stopWords = ['BIR', 'VE', 'ILE', 'ICIN', 'ADET', 'METRE', 'KG', 'MM', 'CM', 'LIK']
  const words = normalized
    .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !stopWords.includes(w.toUpperCase()))

  const keywords = [...new Set(words)] // Unique keywords

  // 5. Kelimeleri ağırlık kategorilerine ayır
  const productTypeKeywords: string[] = []
  const materialKeywords: string[] = []

  for (const kw of keywords) {
    const upper = kw.toUpperCase()
    if (ALL_TYPE_TERMS.has(upper)) {
      productTypeKeywords.push(upper)
    } else if (MATERIAL_TERMS.has(upper)) {
      materialKeywords.push(upper)
    }
  }

  return {
    originalRequest,
    productCode,
    numbers,
    keywords,
    productTypeKeywords,
    materialKeywords,
    measurementPattern
  }
}

// Strategy 1: Exact Match (ürün kodu tam eşleşme)
async function exactMatch(supabase: any, parsed: ParsedRequest): Promise<MatchResult | null> {
  if (!parsed.productCode && parsed.numbers.length < 2) {
    return null
  }

  const startTime = Date.now()

  // Ürün kodu varsa direkt ara
  if (parsed.productCode) {
    console.log('🎯 Exact match: Searching for product code', parsed.productCode)

    // Önce birebir eşleşme dene (wildcard yok = case-insensitive exact match)
    // Bu "NTG-EF-63-50" aramasının "NTG-EF-63" ürününü döndürmesini önler
    const { data: exactData } = await supabase
      .from('products')
      .select('*')
      .ilike('product_code', parsed.productCode)
      .limit(1)

    if (exactData && exactData.length > 0) {
      console.log('🎯 Exact code match (strict):', exactData[0].product_code)
      return {
        product_id: exactData[0].id,
        product: exactData[0],
        confidence: 1.0,
        strategy: 'exact',
        reasoning: `Ürün kodu birebir eşleşme: ${parsed.productCode}`,
        execution_time: Date.now() - startTime
      }
    }

    // Birebir bulunamadı — substring ile dene (örn: OCR'ın kodu kısaltmış olabileceği durum)
    const { data: partialData } = await supabase
      .from('products')
      .select('*')
      .or(`product_code.ilike.%${parsed.productCode}%,search_text.ilike.%${parsed.productCode}%`)
      .limit(5)

    if (partialData && partialData.length === 1) {
      console.log('🎯 Exact code match (partial, single result):', partialData[0].product_code)
      return {
        product_id: partialData[0].id,
        product: partialData[0],
        confidence: 0.95,
        strategy: 'exact',
        reasoning: `Ürün kodu kısmi eşleşme: ${parsed.productCode}`,
        execution_time: Date.now() - startTime
      }
    }

    console.log('🎯 Product code not found in DB:', parsed.productCode, '— falling to FTS')
  }

  // Ölçü pattern'i varsa (63-50 gibi)
  // NOT: Birden fazla ürün varsa limit'i artır (multi-match için)
  if (parsed.measurementPattern) {
    console.log('🎯 Exact match: Searching for pattern', parsed.measurementPattern)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('search_text', `%${parsed.measurementPattern}%`)
      .limit(100)

    console.log('🎯 Exact match results:', data?.length || 0, 'products found')
    if (data && data.length > 0) {
      // Eğer tek ürün varsa direkt döndür
      if (data.length === 1) {
        console.log('🎯 Exact match: Single product, returning immediately')
        return {
          product_id: data[0].id,
          product: data[0],
          confidence: 0.95,
          strategy: 'exact',
          reasoning: `Ölçü pattern eşleşme: ${parsed.measurementPattern}`,
          execution_time: Date.now() - startTime
        }
      }

      // Birden fazla ürün varsa null döndür (full-text search devam etsin)
      // Full-text search birden fazla seçenek döndürecek
      console.log('🎯 Exact match: Multiple products found, passing to full-text search')
      return null
    }
  }

  return null
}

// Ağırlıklı skor hesaplama — ürün tipi kelimeleri 3x, malzeme 2x, diğer 1x
function calculateWeightedScore(product: any, parsed: ParsedRequest): { score: number, matchDetail: string } {
  const searchText = (product.search_text || "").toUpperCase()
  const productType = (product.product_type || "").toUpperCase()

  let weightedHits = 0
  let totalWeight = 0
  const matchedParts: string[] = []

  // Ürün tipi kelimeleri — ağırlık 3.0
  for (const kw of parsed.productTypeKeywords) {
    totalWeight += 3.0
    if (searchText.includes(kw) || productType.includes(kw)) {
      weightedHits += 3.0
      matchedParts.push(`tip:${kw}`)
    }
  }

  // Malzeme kelimeleri — ağırlık 2.0
  for (const kw of parsed.materialKeywords) {
    totalWeight += 2.0
    if (searchText.includes(kw)) {
      weightedHits += 2.0
      matchedParts.push(`malzeme:${kw}`)
    }
  }

  // Diğer kelimeler (sayılar dahil) — ağırlık 1.0
  for (const kw of parsed.keywords) {
    const upper = kw.toUpperCase()
    if (ALL_TYPE_TERMS.has(upper) || MATERIAL_TERMS.has(upper)) continue // zaten sayıldı
    totalWeight += 1.0
    if (searchText.includes(upper)) {
      weightedHits += 1.0
      matchedParts.push(kw)
    }
  }

  // Ürün tipi sözlük bonus: product_type alanında ürün tipi terimi geçiyorsa +0.15
  let typeBonus = 0
  for (const [canonical, variants] of Object.entries(PRODUCT_TYPE_TERMS)) {
    const requestHasTerm = parsed.productTypeKeywords.some(kw => variants.includes(kw))
    const productHasTerm = variants.some(v => productType.includes(v))
    if (requestHasTerm && productHasTerm) {
      typeBonus = 0.15
      matchedParts.push(`bonus:${canonical}`)
      break
    }
  }

  const ratio = totalWeight > 0 ? weightedHits / totalWeight : 0
  return {
    score: ratio + typeBonus,
    matchDetail: matchedParts.join(', ')
  }
}

// Strategy 2: Full-Text Search (PostgreSQL tsvector)
async function fullTextSearch(supabase: any, parsed: ParsedRequest): Promise<MatchResult[]> {
  const startTime = Date.now()

  // Eğer measurement pattern varsa ama keywords yoksa, direkt pattern ile ara
  if (parsed.measurementPattern && parsed.keywords.length === 0) {
    console.log('📊 Full-text: Pattern-only search for', parsed.measurementPattern)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('search_text', `%${parsed.measurementPattern}%`)
      .limit(100)

    console.log('📊 Full-text pattern results:', data?.length || 0, 'products')
    if (data && data.length > 0) {
      const scored = data.map((product: any) => ({
        product_id: product.id,
        product,
        confidence: 0.9,
        strategy: 'fulltext' as const,
        reasoning: `Pattern eşleşme: ${parsed.measurementPattern}`,
        execution_time: Date.now() - startTime
      }))
      return scored
    }
  }

  // Eğer measurement pattern varsa VE keywords varsa, pattern + ağırlıklı keyword araması yap
  if (parsed.measurementPattern && parsed.keywords.length > 0) {
    console.log('📊 Full-text: Pattern + weighted keywords search for', parsed.measurementPattern,
      'typeKW:', parsed.productTypeKeywords, 'matKW:', parsed.materialKeywords)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('search_text', `%${parsed.measurementPattern}%`)
      .limit(100)

    console.log('📊 Full-text pattern+keywords results:', data?.length || 0, 'products')
    if (data && data.length > 0) {
      const scored = data.map((product: any) => {
        const { score: weightedRatio, matchDetail } = calculateWeightedScore(product, parsed)

        // Base 0.5 + weighted ratio * 0.5 → range 0.5–1.0
        const confidence = Math.min(0.5 + weightedRatio * 0.5, 1.0)

        return {
          product_id: product.id,
          product,
          confidence,
          strategy: 'fulltext' as const,
          reasoning: `Pattern + ağırlıklı skor: ${matchDetail} (${(weightedRatio * 100).toFixed(0)}%)`,
          execution_time: Date.now() - startTime
        }
      })

      return scored.sort((a, b) => b.confidence - a.confidence)
    }
  }

  // Anahtar kelimelerden tsquery oluştur
  const tsqueryAnd = parsed.keywords.join(' & ')

  if (!tsqueryAnd) {
    console.log('📊 Full-text: No keywords, returning empty')
    return []
  }

  // 2a. AND araması: tüm kelimelerin eşleşmesi gerekir (yüksek güven)
  console.log('📊 Full-text: tsvector AND search with tsquery:', tsqueryAnd)
  const { data: andData, error: andError } = await supabase
    .from('products')
    .select('*')
    .textSearch('search_vector', tsqueryAnd, {
      type: 'plain',
      config: 'turkish'
    })
    .limit(100)

  console.log('📊 Full-text AND results:', andData?.length || 0, 'products', andError ? `ERROR: ${andError.message}` : '')

  if (andData && andData.length > 0) {
    const scored = andData.map((product: any) => {
      let score = 0.7 // AND match için yüksek base score

      // Ağırlıklı scoring kullan
      const { score: weightedRatio, matchDetail } = calculateWeightedScore(product, parsed)
      score += weightedRatio * 0.25 // AND zaten yüksek güven, weighted ratio ince ayar

      if (parsed.numbers.length > 0) {
        if (parsed.measurementPattern && (product.search_text || "").includes(parsed.measurementPattern)) {
          score += 0.1
        }
      }

      return {
        product_id: product.id,
        product,
        confidence: Math.min(score, 1.0),
        strategy: 'fulltext' as const,
        reasoning: `AND full-text: ${matchDetail}`,
        execution_time: Date.now() - startTime
      }
    })

    return scored.sort((a, b) => b.confidence - a.confidence)
  }

  // 2b. OR fallback: en az bir kelime eşleşmeli (orta güven)
  const tsqueryOr = parsed.keywords.join(' | ')
  console.log('📊 Full-text: AND returned nothing, trying OR search:', tsqueryOr)
  const { data: orData, error: orError } = await supabase
    .from('products')
    .select('*')
    .textSearch('search_vector', tsqueryOr, {
      type: 'plain',
      config: 'turkish'
    })
    .limit(100)

  console.log('📊 Full-text OR results:', orData?.length || 0, 'products', orError ? `ERROR: ${orError.message}` : '')

  if (orData && orData.length > 0) {
    const scored = orData.map((product: any) => {
      const matchedKeywords = parsed.keywords.filter(kw =>
        (product.search_text || "").toLowerCase().includes(kw.toLowerCase())
      )
      const matchRatio = parsed.keywords.length > 0
        ? matchedKeywords.length / parsed.keywords.length
        : 0
      return {
        product_id: product.id,
        product,
        confidence: Math.min(0.5 + matchRatio * 0.2, 0.7), // 0.5–0.7 arası
        strategy: 'fulltext' as const,
        reasoning: `OR full-text: ${matchedKeywords.length}/${parsed.keywords.length} kelime eşleşti`,
        execution_time: Date.now() - startTime
      }
    })
    return scored.sort((a, b) => b.confidence - a.confidence)
  }

  // 2c. ilike fallback: product_type üzerinde doğrudan metin araması (düşük güven)
  console.log('📊 Full-text: FTS returned nothing, trying ilike fallback on product_type')
  const ilikeResults: any[] = []
  const seenIds = new Set<string>()

  for (const keyword of parsed.keywords) {
    if (keyword.length < 2) continue
    const { data: ilikeData } = await supabase
      .from('products')
      .select('*')
      .ilike('search_text', `%${keyword}%`)
      .limit(30)

    if (ilikeData) {
      for (const product of ilikeData) {
        if (!seenIds.has(product.id)) {
          seenIds.add(product.id)
          ilikeResults.push(product)
        }
      }
    }
  }

  console.log('📊 Full-text ilike results:', ilikeResults.length, 'products')

  if (ilikeResults.length > 0) {
    return ilikeResults.map((product: any) => ({
      product_id: product.id,
      product,
      confidence: 0.4,
      strategy: 'fulltext' as const,
      reasoning: `ilike fallback on product_type`,
      execution_time: Date.now() - startTime
    }))
  }

  return []
}

// Strategy 3: AI Fallback (OpenAI - sadece top 10 ürün)
async function aiMatch(
  openAiApiKey: string,
  customerRequest: string,
  candidates: any[]
): Promise<MatchResult | null> {
  const startTime = Date.now()

  if (candidates.length === 0) {
    return null
  }

  // Top 30 adayı OpenAI'ye gönder
  const topCandidates = candidates.slice(0, 30)

  const prompt = `Müşteri Talebi: "${customerRequest}"

Aday Ürünler (${topCandidates.length} adet):
${topCandidates.map((p, i) =>
  `${i+1}. ID: ${p.id} | Kod: ${p.product_code} | Tip: ${p.product_type} | Çap: ${p.diameter || '-'}`
).join('\n')}

En uygun ürünü seç ve güven skoru ver (0-1).
ÖNEMLI: product_id olarak yukarıdaki UUID'yi kullan.

Sadece JSON formatında cevap ver:
{
  "product_id": "uuid-buraya",
  "confidence": 0.95,
  "reasoning": "Kısa açıklama"
}`

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Sen bir ürün eşleştirme asistanısın. Sadece JSON formatında yanıt ver.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    })

    const aiResult = await openaiResponse.json()
    const aiMatch = JSON.parse(aiResult.choices[0].message.content)

    // Ürün detayını ekle
    const product = topCandidates.find(p => p.id === aiMatch.product_id)

    if (!product) {
      return null
    }

    // Token kullanımını logla
    const tokensUsed = aiResult.usage?.total_tokens || 0

    return {
      product_id: aiMatch.product_id,
      product,
      confidence: aiMatch.confidence,
      strategy: 'ai',
      reasoning: `AI: ${aiMatch.reasoning} (${tokensUsed} tokens)`,
      execution_time: Date.now() - startTime
    }
  } catch (error) {
    console.error('AI match error:', error)
    return null
  }
}

// Analytics kaydet
async function logAnalytics(
  supabase: any,
  customerRequest: string,
  result: MatchResult | null
) {
  try {
    await supabase
      .from('match_analytics')
      .insert({
        customer_request: customerRequest,
        matched_product_id: result?.product_id || null,
        strategy: result?.strategy || 'none',
        confidence: result?.confidence || 0,
        execution_time: result?.execution_time || 0,
        tokens_used: result?.reasoning?.includes('tokens')
          ? parseInt(result.reasoning.match(/\d+/)?.[0] || '0')
          : null
      })
  } catch (error) {
    console.error('Analytics logging error:', error)
    // Hata olsa bile devam et
  }
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerRequest, companyId } = await req.json()

    if (!customerRequest) {
      return new Response(
        JSON.stringify({ error: 'customerRequest is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const totalStartTime = Date.now()

    // 1. Talebi parse et
    const parsed = parseCustomerRequest(customerRequest)
    console.log('📋 [DIAG] Input:', customerRequest)
    console.log('📋 [DIAG] Parsed:', JSON.stringify({
      productCode: parsed.productCode,
      numbers: parsed.numbers,
      productTypeKeywords: parsed.productTypeKeywords,
      materialKeywords: parsed.materialKeywords,
      measurementPattern: parsed.measurementPattern,
      keywordCount: parsed.keywords.length
    }))

    // 2. Strategy 1: Exact Match
    const exactResult = await exactMatch(supabase, parsed)
    if (exactResult && exactResult.confidence >= 0.9) {
      console.log('📋 [DIAG] Result: exact-match →', exactResult.product.product_code, 'confidence:', exactResult.confidence)
      await logAnalytics(supabase, customerRequest, exactResult)

      return new Response(
        JSON.stringify({
          matched: [exactResult],
          method: 'exact-match',
          totalTime: Date.now() - totalStartTime,
          parsed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Strategy 2: Full-Text Search
    const ftResults = await fullTextSearch(supabase, parsed)
    if (ftResults.length > 0 && ftResults[0].confidence >= 0.7) {
      console.log('✓ Full-text match found:', ftResults[0].product.product_code, ftResults[0].confidence)

      // Multi-match kontrol: Eğer birden fazla ürün benzer confidence'a sahipse hepsini döndür
      const topConfidence = ftResults[0].confidence
      const similarResults = ftResults.filter(r =>
        Math.abs(r.confidence - topConfidence) < 0.1 // %10'dan az fark varsa benzer sayılır (eski: 0.05)
      )

      console.log('📋 [DIAG] Top confidence:', topConfidence.toFixed(3),
        '| Similar results:', similarResults.length,
        '| Top 3:', ftResults.slice(0, 3).map(r =>
          `${r.product.product_code}=${r.confidence.toFixed(3)}`
        ).join(', ')
      )

      // Eğer 2+ benzer sonuç varsa, kullanıcıya seçim yaptır
      const isMultiMatch = similarResults.length >= 2

      await logAnalytics(supabase, customerRequest, ftResults[0])

      return new Response(
        JSON.stringify({
          matched: isMultiMatch ? similarResults : ftResults,
          method: 'fulltext-search',
          isMultiMatch, // Frontend için flag
          multiMatchMessage: isMultiMatch
            ? `${similarResults.length} benzer ürün bulundu. Lütfen uygun olanı seçin:`
            : null,
          totalTime: Date.now() - totalStartTime,
          parsed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Strategy 3: AI Fallback (OpenAI)
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openAiApiKey) {
      console.log('⚠ No OpenAI key, returning full-text results')
      await logAnalytics(supabase, customerRequest, ftResults[0] || null)

      return new Response(
        JSON.stringify({
          matched: ftResults,
          method: 'fulltext-fallback',
          message: 'OpenAI not available, using full-text results',
          totalTime: Date.now() - totalStartTime,
          parsed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // AI ile eşleştir (sadece full-text adaylarıyla — random ürünler kullanılmaz!)
    let candidates = ftResults.map(r => r.product)
    if (candidates.length === 0) {
      // Aday yoksa AI çağırmak anlamsız: daima DB'deki ilk ürünü seçerdi
      console.log('⚠ No candidates found, skipping AI fallback to avoid random first-product bias')
      await logAnalytics(supabase, customerRequest, null)
      return new Response(
        JSON.stringify({
          matched: [],
          method: 'no-match',
          message: 'Ürün bulunamadı',
          totalTime: Date.now() - totalStartTime,
          parsed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const aiResult = await aiMatch(openAiApiKey, customerRequest, candidates)

    if (aiResult) {
      console.log('✓ AI match found:', aiResult.product.product_code, aiResult.confidence)
      await logAnalytics(supabase, customerRequest, aiResult)

      return new Response(
        JSON.stringify({
          matched: [aiResult],
          method: 'ai-fallback',
          totalTime: Date.now() - totalStartTime,
          parsed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Hiçbir eşleşme bulunamadı
    console.log('✗ No match found')
    await logAnalytics(supabase, customerRequest, null)

    return new Response(
      JSON.stringify({
        matched: [],
        method: 'no-match',
        message: 'Ürün bulunamadı',
        totalTime: Date.now() - totalStartTime,
        parsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Match error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
