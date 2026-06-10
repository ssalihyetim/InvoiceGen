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

// Eşleşme eşiği — bunun altındaki sonuçlar UI'ya gönderilmez (UI gate 0.3, bu yedek üstü).
const MIN_CONFIDENCE = 0.35

// Yapısal-kategori çatışma haritası. BORU bir hat ürünü; geri kalanlar bağlantı parçası.
// Bir hat ürünü (BORU) ile bir bağlantı parçası talebi yapısal olarak zıttır → hard reject.
// Compound korumalı: çatışma sadece talebin tipi ürünün HİÇBİR tipinde yoksa uygulanır
// (ör. "KAPLİN DİRSEK" ürünü hem KAPLİN hem DİRSEK içerir, DİRSEK talebini reddetmez).
const INCOMPATIBLE_TYPES: Record<string, string[]> = {
  'BORU': ['DİRSEK', 'MANŞON', 'TE', 'REDÜKSİYON', 'RAKOR', 'FLANŞ', 'VANA', 'ADAPTÖR', 'KÖRTAPA', 'SEMER', 'KAPLİN'],
}

// Türkçe metin normalizasyonu: derece işaretlerini birleştir (° U+00B0 → º U+00BA,
// katalogda º kullanılıyor), çoklu boşluk sadeleştir. Türkçe İ/I büyük harf tutarlılığı.
function normalizeText(s: string): string {
  return s
    .replace(/°/g, 'º')            // U+00B0 → U+00BA (katalog formatı)
    .replace(/ /g, ' ')       // non-breaking space
    .replace(/\s+/g, ' ')
    .trim()
}

// Basınç/sınıf token'ları — bunlar çap DEĞİL (PN16, SDR11, DN100 gibi).
const PRESSURE_RE = /^(PN|SDR|DN)\d+$/i

// Talep metninden çapları çıkar. Öncelik: D-prefix > MM-suffix > AxB redüksiyon > en büyük makul sayı.
// Açılar (90º, 45º) çaptan dışlanır.
function extractDimensions(raw: string): { diameters: string[]; angles: string[]; primaryDiameter?: string; reductionPattern?: string } {
  const norm = normalizeText(raw).toUpperCase()

  // 1. Açılar: <sayı>º veya <sayı> DERECE → açı listesi (çaptan dışlanacak).
  //    º harf-olmayan bir sembol; \b ondan sonra eşleşmediği için ayrı ele alınır.
  const angles: string[] = []
  for (const m of norm.matchAll(/(\d+)\s*º/g)) angles.push(m[1])
  for (const m of norm.matchAll(/(\d+)\s*DERECE\b/g)) angles.push(m[1])
  const angleSet = new Set(angles)

  const diameters: string[] = []
  let reductionPattern: string | undefined

  // 2. Redüksiyon: A*B / AxB / A-B (D-prefix opsiyonel, * veya x veya / ayırıcı) → her iki çap
  //    Örn "D110*D90", "75-63", "110x90", "180/200-63" (ilk iki sayı)
  const redM = norm.match(/D?(\d+)\s*[*x/×-]\s*D?(\d+)/i)
  if (redM && !angleSet.has(redM[1]) && !angleSet.has(redM[2])) {
    diameters.push(redM[1], redM[2])
    reductionPattern = `${redM[1]}x${redM[2]}`
  }

  // 3. D-prefix çaplar: D50, D110
  for (const m of norm.matchAll(/\bD(\d+)\b/g)) {
    if (!angleSet.has(m[1]) && !diameters.includes(m[1])) diameters.push(m[1])
  }

  // 4. MM-suffix çaplar: 355MM, 63 MM
  for (const m of norm.matchAll(/(\d+)\s*MM\b/g)) {
    if (!angleSet.has(m[1]) && !diameters.includes(m[1])) diameters.push(m[1])
  }

  // 5. Hâlâ çap yoksa: açı/basınç olmayan en büyük makul sayı
  if (diameters.length === 0) {
    const tokens = norm.split(/\s+/)
    const candidates: number[] = []
    for (const m of norm.matchAll(/\b(\d+)\b/g)) {
      const n = m[1]
      if (angleSet.has(n)) continue
      // PN16/SDR11 gibi basınç token'larının parçası mı? (komşu token kontrolü)
      const inPressure = tokens.some(t => PRESSURE_RE.test(t) && t.replace(/\D/g, '') === n)
      if (inPressure) continue
      const num = parseInt(n, 10)
      // çok küçük serbest sayılar (ör. miktar "10 adet") çap olmayabilir; yine de aday say
      candidates.push(num)
    }
    if (candidates.length > 0) {
      diameters.push(String(Math.max(...candidates)))
    }
  }

  return {
    diameters,
    angles,
    primaryDiameter: diameters[0],
    reductionPattern,
  }
}

// Ürünün search_text'inde verilen çapın geçip geçmediğini kontrol eder.
// Word-boundary + mm-toleranslı: "355" → "355MM"/"355mm"/"355 MM" eşleşir, "1355" eşleşmez.
function productHasDiameter(searchText: string, dia: string): boolean {
  const re = new RegExp(`(^|[^0-9])${dia}(\\s*MM)?([^0-9]|$)`, 'i')
  return re.test(searchText)
}

// Talep/ürün metninden kanonik yapısal tipleri çıkarır (PRODUCT_TYPE_TERMS üzerinden).
function getCanonicalTypes(text: string): Set<string> {
  const upper = text.toUpperCase()
  const found = new Set<string>()
  for (const [canonical, variants] of Object.entries(PRODUCT_TYPE_TERMS)) {
    if (variants.some(v => upper.includes(v))) found.add(canonical)
  }
  return found
}

// Bir tip keyword'ü (ör. ASCII "DIRSEK") metinde varyantlarıyla birlikte arar.
// Türkçe İ/I sorunu: talep "DIRSEK" (ASCII) gelir ama katalog "DİRSEK" (Türkçe) saklar;
// kw'nin kanonik grubundaki TÜM varyantları kontrol ederek eşleşmeyi yakalar.
function typeKeywordInText(text: string, kw: string): boolean {
  for (const variants of Object.values(PRODUCT_TYPE_TERMS)) {
    if (variants.includes(kw)) return variants.some(v => text.includes(v))
  }
  return text.includes(kw)
}

interface ParsedRequest {
  originalRequest: string
  normalizedRequest: string // normalizeText uygulanmış ham ifade (FTS için)
  productCode?: string      // Tespit edilen ürün kodu
  numbers: string[]         // Çıkarılan sayılar (örn: ["63", "50"])
  keywords: string[]        // Temizlenmiş kelimeler
  productTypeKeywords: string[]  // Ürün tipini belirleyen kelimeler (yüksek ağırlık)
  materialKeywords: string[]     // Malzeme terimleri (orta ağırlık)
  diameters: string[]       // Tespit edilen çaplar (açılar hariç)
  angles: string[]          // Açılar (90º, 45º) — çap değil
  primaryDiameter?: string  // Ankraj için birincil çap
  reductionPattern?: string // Yalnız gerçek AxB redüksiyon (örn "110x90"), asla açı+çap
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
  const normalizedRequest = normalizeText(request)
  const normalized = normalizedRequest.toUpperCase()

  // 1. Sayıları çıkar (63, 50, 125, vs)
  const numberMatches = request.match(/\d+/g) || []
  const numbers = numberMatches.map(n => n.trim())

  // 2. Ürün kodu tespiti — yalnızca HARF içeren kod desenleri (NTG-EF-63 gibi).
  //    Baştaki müşteri katalog kodu ("001 117 0021 0050") ürün kodu DEĞİL — katalog
  //    product_code ile eşleşmiyor (kanıtlandı), o yüzden saf-rakam dizilerini kod sayma.
  const codeMatches = normalized.match(/\b[A-Z]{2,}(?:[-][A-Z0-9]+)+\b/g)
  const productCode = codeMatches?.[0]

  // 3. Çap/açı tespiti — açıları (90º) çaptan ayır, "90-355" gibi sahte pattern ÜRETME.
  const { diameters, angles, primaryDiameter, reductionPattern } = extractDimensions(request)

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
    normalizedRequest,
    productCode,
    numbers,
    keywords,
    productTypeKeywords,
    materialKeywords,
    diameters,
    angles,
    primaryDiameter,
    reductionPattern
  }
}

// Strategy 1: Exact Match (ürün kodu tam eşleşme veya çap+tip ile tek aday)
async function exactMatch(supabase: any, parsed: ParsedRequest): Promise<MatchResult | null> {
  if (!parsed.productCode && !parsed.primaryDiameter) {
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

  // Çap varsa: çapa ankrajlı ara, gate'lerden geçen TEK ürün kalırsa exact döndür.
  // (Eski "measurementPattern '90-355'" mantığı kaldırıldı — sahte pattern üretiyordu.)
  if (parsed.primaryDiameter) {
    console.log('🎯 Exact match: Searching by diameter', parsed.primaryDiameter)
    const { data } = await supabase
      .from('products')
      .select('*')
      .ilike('search_text', `%${parsed.primaryDiameter}%`)
      .limit(500)

    if (data && data.length > 0) {
      // Çap + tip gate'lerinden geçenleri ele al (yanlış-çap/yanlış-tip elenir)
      const gated = data.filter((p: any) => {
        const { rejected } = calculateWeightedScore(p, parsed)
        return !rejected && productHasDiameter((p.search_text || '').toUpperCase(), parsed.primaryDiameter!)
      })
      console.log('🎯 Exact match: diameter pool', data.length, '→ gated', gated.length)
      if (gated.length === 1) {
        return {
          product_id: gated[0].id,
          product: gated[0],
          confidence: 0.95,
          strategy: 'exact',
          reasoning: `Çap + tip birebir eşleşme: ${parsed.primaryDiameter}`,
          execution_time: Date.now() - startTime
        }
      }
      // Birden fazla aday → full-text search skorlasın/multi-match yapsın
      console.log('🎯 Exact match: Multiple gated candidates, passing to full-text')
      return null
    }
  }

  return null
}

// Ağırlıklı skor hesaplama — ürün tipi kelimeleri 3x, malzeme 2x, diğer 1x.
// Hard reject: çap tutmuyorsa veya yapısal tip zıtsa aday tamamen elenir (rejected:true).
function calculateWeightedScore(product: any, parsed: ParsedRequest): { score: number, matchDetail: string, rejected: boolean } {
  const searchText = (product.search_text || "").toUpperCase()
  const productType = (product.product_type || "").toUpperCase()

  // --- HARD GATE 1: Çap eşleşmesi zorunlu ---
  // Talep bir çap belirtiyorsa, ürün o çapı içermiyorsa aday elenir.
  if (parsed.primaryDiameter && !productHasDiameter(searchText, parsed.primaryDiameter)) {
    return { score: 0, matchDetail: `diameter-miss:${parsed.primaryDiameter}`, rejected: true }
  }

  // --- HARD GATE 2: Zıt yapısal tip ---
  // Talep tipleri ile ürün tipleri INCOMPATIBLE_TYPES'a göre zıt kategorideyse aday elenir.
  // Compound korumalı: talebin tipi ürünün tiplerinden BİRİNDE varsa çatışma yok.
  const reqTypes = getCanonicalTypes(parsed.productTypeKeywords.join(' '))
  if (reqTypes.size > 0) {
    const prodTypes = getCanonicalTypes(productType)
    // Talep tiplerinden hiçbiri üründe yoksa VE zıt bir kategori varsa reddet
    const reqInProd = [...reqTypes].some(t => prodTypes.has(t))
    if (!reqInProd) {
      for (const rt of reqTypes) {
        const incompatible = INCOMPATIBLE_TYPES[rt] || []
        const prodHasIncompatible = [...prodTypes].some(pt => incompatible.includes(pt))
        // simetrik kontrol: ürün BORU iken talep bağlantı parçası ise de reddet
        const reverseIncompatible = [...prodTypes].some(pt => (INCOMPATIBLE_TYPES[pt] || []).includes(rt))
        if (prodHasIncompatible || reverseIncompatible) {
          return { score: 0, matchDetail: `type-mismatch:${rt}≠${[...prodTypes].join('/')}`, rejected: true }
        }
      }
    }
  }

  let weightedHits = 0
  let totalWeight = 0
  const matchedParts: string[] = []

  // Ürün tipi kelimeleri — ağırlık 3.0 (varyant-aware: ASCII "DIRSEK" ↔ Türkçe "DİRSEK")
  for (const kw of parsed.productTypeKeywords) {
    totalWeight += 3.0
    if (typeKeywordInText(searchText, kw) || typeKeywordInText(productType, kw)) {
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
    matchDetail: matchedParts.join(', '),
    rejected: false
  }
}

// Bir aday listesini calculateWeightedScore ile skorlar, rejected (çap/tip gate) olanları atar.
// confidence = clamp(base + ratio*span + typeBonus). Çap eşleşmesine küçük ek bonus.
function scoreAndGate(
  products: any[],
  parsed: ParsedRequest,
  base: number,
  span: number,
  cap: number,
  label: string,
  startTime: number
): MatchResult[] {
  const out: MatchResult[] = []
  for (const product of products) {
    const { score: ratio, matchDetail, rejected } = calculateWeightedScore(product, parsed)
    if (rejected) continue // çap/tip gate — yanlış-çap/yanlış-tip aday tamamen elenir
    let confidence = base + ratio * span
    // Çap doğrulandıysa küçük ek güven (gate zaten geçildi)
    if (parsed.primaryDiameter && productHasDiameter((product.search_text || '').toUpperCase(), parsed.primaryDiameter)) {
      confidence += 0.05
    }
    confidence = Math.min(confidence, cap)
    out.push({
      product_id: product.id,
      product,
      confidence,
      strategy: 'fulltext',
      reasoning: `${label}: ${matchDetail}`,
      execution_time: Date.now() - startTime,
    })
  }
  return out.sort((a, b) => b.confidence - a.confidence)
}

// Strategy 2: Full-Text Search (PostgreSQL tsvector). Ham ifadeyle tsquery kurar
// (lexeme bozulmasını önler), her katmanda calculateWeightedScore ile skorlar + gate'ler.
async function fullTextSearch(supabase: any, parsed: ParsedRequest): Promise<MatchResult[]> {
  const startTime = Date.now()

  // 2a. AND araması: HAM normalize ifadeyle plainto_tsquery (turkish).
  //     Elle tokenize (355MM→355, 90º→90) lexeme'leri bozuyordu; ham ifade lexeme'leri
  //     (355mm, 90º) korur → doğru eşleşme bulunur.
  console.log('📊 Full-text AND (raw plainto):', parsed.normalizedRequest)
  const { data: andData, error: andError } = await supabase
    .from('products')
    .select('*')
    .textSearch('search_vector', parsed.normalizedRequest, {
      type: 'plain',
      config: 'turkish'
    })
    .limit(500)

  console.log('📊 AND results:', andData?.length || 0, andError ? `ERROR: ${andError.message}` : '')

  if (andData && andData.length > 0) {
    const scored = scoreAndGate(andData, parsed, 0.6, 0.35, 0.97, 'AND full-text', startTime)
    if (scored.length > 0) return scored
    console.log('📊 AND: tüm adaylar gate ile elendi, OR/çap fallback denenecek')
  }

  // 2b. Çap-ankrajlı fallback: çap varsa, o çaptaki ürünleri çek + tip keyword ile daralt,
  //     skorla + gate. Bu, AND'in OCR gürültüsünde kaçırdığı doğru ürünü kurtarır.
  if (parsed.primaryDiameter) {
    console.log('📊 Diameter-anchored fallback:', parsed.primaryDiameter)
    let q = supabase.from('products').select('*').ilike('search_text', `%${parsed.primaryDiameter}%`)
    // Tip keyword varsa havuzu daralt — varyant-aware (ASCII "DIRSEK" + Türkçe "DİRSEK" birlikte).
    if (parsed.productTypeKeywords.length > 0) {
      const kw = parsed.productTypeKeywords[0]
      let variants = [kw]
      for (const vs of Object.values(PRODUCT_TYPE_TERMS)) {
        if (vs.includes(kw)) { variants = vs; break }
      }
      const orExpr = variants.map(v => `search_text.ilike.%${v}%`).join(',')
      q = q.or(orExpr)
    }
    const { data: diaData } = await q.limit(500)
    console.log('📊 Diameter pool:', diaData?.length || 0)
    if (diaData && diaData.length > 0) {
      const scored = scoreAndGate(diaData, parsed, 0.4, 0.45, 0.9, 'Çap-ankrajlı', startTime)
      if (scored.length > 0) return scored
    }
  }

  // 2c. OR fallback: tsvector OR (en az bir kelime), skorla + gate. Düşük taban güven.
  const tsqueryOr = parsed.keywords.filter(k => k.length >= 2).join(' | ')
  if (tsqueryOr) {
    console.log('📊 OR fallback:', tsqueryOr)
    const { data: orData } = await supabase
      .from('products')
      .select('*')
      .textSearch('search_vector', tsqueryOr, { type: 'plain', config: 'turkish' })
      .limit(500)
    console.log('📊 OR results:', orData?.length || 0)
    if (orData && orData.length > 0) {
      const scored = scoreAndGate(orData, parsed, 0.35, 0.35, 0.75, 'OR full-text', startTime)
      if (scored.length > 0) return scored
    }
  }

  // Hiçbir gate'li aday yok → boş döndür (yanlış eşleşme yerine "bulunamadı").
  // (Eski sabit-0.4 ilike fallback KALDIRILDI — çöp eşleşmelerin kaynağıydı.)
  console.log('📊 Full-text: gate sonrası aday yok → boş')
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

    // Service role: this function runs server-side only and must keep reading
    // products after the RLS cleanup migration removes the legacy anon-read
    // policies. SUPABASE_SERVICE_ROLE_KEY is auto-injected into edge functions;
    // anon key remains as a fallback for local serving without secrets.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const totalStartTime = Date.now()

    // 1. Talebi parse et
    const parsed = parseCustomerRequest(customerRequest)
    console.log('📋 [DIAG] Input:', customerRequest)
    console.log('📋 [DIAG] Parsed:', JSON.stringify({
      productCode: parsed.productCode,
      diameters: parsed.diameters,
      angles: parsed.angles,
      primaryDiameter: parsed.primaryDiameter,
      reductionPattern: parsed.reductionPattern,
      productTypeKeywords: parsed.productTypeKeywords,
      materialKeywords: parsed.materialKeywords,
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

    // 3. Strategy 2: Full-Text Search — sonuçlar zaten skorlu + gate'li (rejected elenmiş).
    //    Backend eşiği uygula: MIN_CONFIDENCE altı asla UI'ya gitmez.
    const ftAll = await fullTextSearch(supabase, parsed)
    const ftResults = ftAll.filter(r => r.confidence >= MIN_CONFIDENCE)

    console.log('📋 [DIAG] FT:', ftAll.length, 'aday →', ftResults.length, '≥MIN |',
      ftResults.slice(0, 3).map(r => `${r.product.product_code}=${r.confidence.toFixed(3)}`).join(', '))

    if (ftResults.length > 0) {
      const topConfidence = ftResults[0].confidence
      const similarResults = ftResults.filter(r => Math.abs(r.confidence - topConfidence) < 0.1)

      // Yüksek güven (≥0.7): tek güçlü eşleşme veya benzer-güçlü multi-match.
      // Orta güven [MIN,0.7): "makul ama kesin değil" → daima multi-match (kullanıcı seçsin).
      const isHigh = topConfidence >= 0.7
      const isMultiMatch = !isHigh || similarResults.length >= 2
      const matched = isMultiMatch ? similarResults : ftResults

      await logAnalytics(supabase, customerRequest, ftResults[0])

      return new Response(
        JSON.stringify({
          matched,
          method: 'fulltext-search',
          isMultiMatch,
          multiMatchMessage: isMultiMatch
            ? `${matched.length} olası ürün bulundu. Lütfen uygun olanı seçin:`
            : null,
          totalTime: Date.now() - totalStartTime,
          parsed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Strategy 3: AI Fallback — yalnız gate'li adaylarla (ftAll, eşik-altı dahil ama rejected hariç).
    //    Aday yoksa AI'ı atla (random-ilk-ürün önyargısını önle).
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    const candidates = ftAll.map(r => r.product)

    if (!openAiApiKey || candidates.length === 0) {
      if (!openAiApiKey) console.log('⚠ No OpenAI key; eşik-altı sonuç dönmez → no-match')
      else console.log('⚠ Gate sonrası aday yok → no-match')
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

    // AI dönüşünü yeniden doğrula: çap gate + MIN_CONFIDENCE (model yanlış-çap seçebilir).
    if (aiResult) {
      const aiSearchText = (aiResult.product.search_text || '').toUpperCase()
      const diameterOk = !parsed.primaryDiameter || productHasDiameter(aiSearchText, parsed.primaryDiameter)
      if (diameterOk && aiResult.confidence >= MIN_CONFIDENCE) {
        console.log('✓ AI match (validated):', aiResult.product.product_code, aiResult.confidence)
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
      console.log('⚠ AI seçimi gate/eşik geçemedi (çap/min) → no-match:', aiResult.product.product_code)
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
