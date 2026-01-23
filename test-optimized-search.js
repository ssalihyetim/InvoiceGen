/**
 * Test Script: Optimize Edilmiş Ürün Eşleştirme Sistemi
 *
 * Test senaryoları:
 * 1. Net ürün kodu (Exact match bekleniyor)
 * 2. Ölçü + kelime (Full-text bekleniyor)
 * 3. Sadece sayılar (Full-text bekleniyor)
 * 4. Belirsiz talep (AI fallback bekleniyor)
 */

const SUPABASE_URL = 'https://zsmaltekrsnitlekjxad.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const testCases = [
  {
    name: 'Test 1: Net Ürün Kodu (Exact Match Bekleniyor)',
    request: 'NTG EF 63-50',
    expectedStrategy: 'exact-match',
    expectedProduct: 'NTG EF 63-50'
  },
  {
    name: 'Test 2: Ölçü + Kelime (Full-text Bekleniyor)',
    request: '63-50 servis te',
    expectedStrategy: 'fulltext-search',
    expectedProduct: 'NTG EF 63-50 EF SERVİS TE SDR11'
  },
  {
    name: 'Test 3: Sadece Sayılar (Full-text Bekleniyor)',
    request: '75-40',
    expectedStrategy: 'fulltext-search',
    expectedProduct: '75-40'
  },
  {
    name: 'Test 4: Tam Ürün Adı',
    request: 'NTG EF 110-63 EF SERVİS TE SDR11',
    expectedStrategy: 'exact-match',
    expectedProduct: 'NTG EF 110-63'
  },
  {
    name: 'Test 5: Belirsiz Talep (AI Fallback)',
    request: 'büyük boy servis te lazım',
    expectedStrategy: 'ai-fallback',
    expectedProduct: null // AI'nin bulacağı
  }
]

async function runTest(testCase) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 ${testCase.name}`)
  console.log(`📝 Talep: "${testCase.request}"`)
  console.log(`🎯 Beklenen Strateji: ${testCase.expectedStrategy}`)
  console.log(`${'='.repeat(60)}`)

  const startTime = Date.now()

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/match-product`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          customerRequest: testCase.request
        })
      }
    )

    const result = await response.json()
    const totalTime = Date.now() - startTime

    console.log(`\n✅ Sonuç:`)
    console.log(`   Strateji: ${result.method}`)
    console.log(`   Toplam Süre: ${totalTime}ms`)

    if (result.parsed) {
      console.log(`   Parse Detayları:`)
      console.log(`     - Ürün Kodu: ${result.parsed.productCode || 'Yok'}`)
      console.log(`     - Sayılar: [${result.parsed.numbers.join(', ')}]`)
      console.log(`     - Ölçü Pattern: ${result.parsed.measurementPattern || 'Yok'}`)
      console.log(`     - Anahtar Kelimeler: [${result.parsed.keywords.join(', ')}]`)
    }

    if (result.matched && result.matched.length > 0) {
      const match = result.matched[0]
      console.log(`\n🎯 Bulunan Ürün:`)
      console.log(`   Kod: ${match.product.product_code}`)
      console.log(`   Tip: ${match.product.product_type}`)
      console.log(`   Güven: ${(match.confidence * 100).toFixed(1)}%`)
      console.log(`   Strateji: ${match.strategy}`)
      console.log(`   Açıklama: ${match.reasoning}`)
      console.log(`   Süre: ${match.execution_time}ms`)

      // Beklenen strateji kontrolü
      if (result.method === testCase.expectedStrategy) {
        console.log(`\n✅ TEST BAŞARILI - Doğru strateji kullanıldı!`)
      } else {
        console.log(`\n⚠️  UYARI - Farklı strateji kullanıldı!`)
        console.log(`   Beklenen: ${testCase.expectedStrategy}`)
        console.log(`   Gerçekleşen: ${result.method}`)
      }
    } else {
      console.log(`\n❌ Ürün bulunamadı`)
    }

  } catch (error) {
    console.error(`\n❌ HATA:`, error.message)
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Optimize Edilmiş Ürün Eşleştirme Sistemi - Test Suite   ║
║                                                            ║
║   Beklenen İyileştirmeler:                                 ║
║   - 10x Hız Artışı (5s → 0.5s)                            ║
║   - %98 Maliyet Azaltımı ($70 → $0.50/ay)                 ║
║   - 10,000+ Ürün Desteği                                   ║
╚════════════════════════════════════════════════════════════╝
`)

  for (const testCase of testCases) {
    await runTest(testCase)
    await new Promise(resolve => setTimeout(resolve, 500)) // Kısa bekleme
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🏁 Tüm testler tamamlandı!`)
  console.log(`${'='.repeat(60)}\n`)
}

main()
