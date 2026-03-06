import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { products, fileName, fileSize } = body

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    console.log(`\n=== Import Başladı ===`)
    console.log(`Toplam ürün sayısı: ${products.length}`)
    const startTime = Date.now()

    let successCount = 0
    let failedCount = 0
    const errors: any[] = []

    // Önce batch'e göndermeden önce product_code'a göre deduplicate et
    // (aynı dosyada veya farklı sheet'lerde aynı kod varsa son occurrence kazanır)
    const deduplicatedMap = new Map<string, any>()
    for (const product of products) {
      if (product.product_code) {
        deduplicatedMap.set(String(product.product_code).trim(), product)
      }
    }
    const deduplicatedProducts = Array.from(deduplicatedMap.values())
    const skippedDuplicates = products.length - deduplicatedProducts.length
    if (skippedDuplicates > 0) {
      console.log(`  ℹ️ ${skippedDuplicates} adet dosya içi duplicate product_code atlandı`)
    }

    // Batch işleme için 500'lük gruplara böl
    const BATCH_SIZE = 500
    const totalBatches = Math.ceil(deduplicatedProducts.length / BATCH_SIZE)

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, deduplicatedProducts.length)
      const batch = deduplicatedProducts.slice(start, end)

      console.log(`Batch ${batchIndex + 1}/${totalBatches}: ${start}-${end} (${batch.length} ürün)`)

      // Validasyon ve data hazırlama
      const validProducts = []

      for (const product of batch) {
        // Sadece ürün kodu zorunlu, tip boş olabilir
        if (!product.product_code) {
          failedCount++
          errors.push({
            product_code: product.product_code || '(boş)',
            error: `Ürün kodu gerekli. Gelen data: ${JSON.stringify(product).substring(0, 100)}`
          })

          // İlk 5 hatayı detaylı logla
          if (failedCount <= 5) {
            console.warn(`  ⚠️ Validation hatası:`, product)
          }

          continue
        }

        // Normalize currency: TL → TRY
        let currency = (product.currency || 'EUR').toUpperCase()  // Varsayılan EUR
        if (currency === 'TL' || currency === '₺') currency = 'TRY'
        if (!['TRY', 'USD', 'EUR'].includes(currency)) currency = 'EUR'  // Geçersiz ise EUR

        const productData = {
          product_type: product.product_type || 'Tanımsız Ürün',  // Boşsa varsayılan değer
          diameter: product.diameter || null,
          product_code: product.product_code,
          base_price: (typeof product.base_price === 'number' && isFinite(product.base_price)) ? product.base_price : 0,
          currency: currency,
          unit: product.unit || 'adet',
          description: product.description || null,
        }

        validProducts.push(productData)
      }

      if (validProducts.length > 0) {
        try {
          // ignoreDuplicates: true → mevcut ürünleri hata vermeden atla (sadece yeni ürünleri ekle)
          const { error } = await supabase
            .from('products')
            .upsert(validProducts as any, {
              onConflict: 'product_code',
              ignoreDuplicates: true
            })

          if (error) {
            console.error(`Batch ${batchIndex + 1} hatası:`, error.message)
            failedCount += validProducts.length
            validProducts.forEach(p => {
              errors.push({
                product_code: p.product_code,
                error: error.message
              })
            })
          } else {
            successCount += validProducts.length
            console.log(`  ✓ ${validProducts.length} ürün işlendi`)
          }
        } catch (err: any) {
          console.error(`Batch ${batchIndex + 1} kritik hata:`, err.message)
          failedCount += validProducts.length
          validProducts.forEach(p => {
            errors.push({
              product_code: p.product_code,
              error: err.message
            })
          })
        }
      }
    }

    // Import geçmişini kaydet
    try {
      const { error: historyError } = await (supabase as any)
        .from('import_history')
        .insert({
          file_name: fileName || 'Unknown File',
          file_size: fileSize || 0,
          total_rows: products.length,
          successful_imports: successCount,
          failed_imports: failedCount,
          error_log: errors.length > 0 ? errors : null,
        })

      if (historyError) {
        console.warn('Import history kaydedilemedi:', historyError.message)
      }
    } catch (historyErr) {
      console.warn('Import history error:', historyErr)
    }

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log(`\n=== Import Tamamlandı ===`)
    console.log(`Başarılı: ${successCount}`)
    console.log(`Başarısız: ${failedCount}`)
    console.log(`Toplam süre: ${duration} saniye`)
    console.log(`Ortalama: ${(products.length / parseFloat(duration)).toFixed(0)} ürün/saniye`)

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors: errors.slice(0, 10), // İlk 10 hatayı döndür
    })
  } catch (error: any) {
    console.error('Import API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
