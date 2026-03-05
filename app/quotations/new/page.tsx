'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import ImageUploadTab from '@/components/quotations/ImageUploadTab'
import ProductSelectionModal from '@/components/quotations/ProductSelectionModal'
import BatchMultiMatchModal from '@/components/quotations/BatchMultiMatchModal'
import { generateQuotationPDF } from '@/lib/pdf-generator'

// Supabase Edge Function URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const MATCH_PRODUCT_URL = `${SUPABASE_URL}/functions/v1/match-product`

type Company = {
  id: string
  name: string
}

type Product = {
  id: string
  product_type: string
  diameter: string | null
  product_code: string
  base_price: number
  currency: string
  unit: string
  description: string | null
}

type QuotationItem = {
  product: Product
  quantity: number
  discount_percentage: number
  ai_matched: boolean
  original_request?: string
}

export default function NewQuotationPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [customerRequest, setCustomerRequest] = useState('')
  const [items, setItems] = useState<QuotationItem[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  // Manuel seçim için
  const [activeTab, setActiveTab] = useState<'ai' | 'manual' | 'image'>('ai')
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')

  // Multi-match modal için (tek talep)
  const [showMultiMatchModal, setShowMultiMatchModal] = useState(false)
  const [multiMatchResults, setMultiMatchResults] = useState<any[]>([])
  const [multiMatchMessage, setMultiMatchMessage] = useState('')
  const [pendingRequest, setPendingRequest] = useState('')

  // Batch multi-match modal için (Excel/Görsel)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchPendingMatches, setBatchPendingMatches] = useState<any[]>([])

  // Görsel eşleştirme ilerleme durumu
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null)

  // Eşleşemeyen OCR satırları
  const [unmatchedItems, setUnmatchedItems] = useState<string[]>([])

  // Firmaları yükle
  useEffect(() => {
    loadCompanies()
    loadProducts()
  }, [])

  const loadCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')

    if (data) setCompanies(data)
  }

  const loadProducts = async () => {
    const PAGE = 1000
    const allProducts: Product[] = []
    let from = 0

    while (true) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('product_code')
        .range(from, from + PAGE - 1)
      if (!data || data.length === 0) break
      allProducts.push(...(data as Product[]))
      if (data.length < PAGE) break
      from += PAGE
    }

    setProducts(allProducts)
  }

  const handleAISearch = async () => {
    if (!customerRequest.trim()) return

    setSearching(true)
    try {
      const response = await fetch(MATCH_PRODUCT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          customerRequest,
          companyId: selectedCompany
        })
      })

      const result = await response.json()
      console.log('AI Result:', result)

      if (result.matched && result.matched.length > 0) {
        // Multi-match kontrolü
        if (result.isMultiMatch && result.matched.length > 1) {
          console.log('Multi-match detected:', result.matched.length, 'products')
          setMultiMatchResults(result.matched)
          setMultiMatchMessage(result.multiMatchMessage || 'Birden fazla ürün bulundu. Lütfen seçin:')
          setPendingRequest(customerRequest)
          setShowMultiMatchModal(true)
          setSearching(false)
          return
        }

        // Tek ürün varsa direkt ekle
        const match = result.matched[0]

        // Eğer product objesi yoksa, ID ile bul
        let product = match.product
        if (!product && match.product_id) {
          product = products.find(p => p.id === match.product_id)
        }

        if (product && match.confidence > 0.3) {
          addItem(product, true, customerRequest)
          setCustomerRequest('')
        } else {
          alert('Uygun ürün bulunamadı (düşük güven skoru veya ürün yok). Manuel olarak seçebilirsiniz.')
          setActiveTab('manual')
        }
      } else {
        alert('Ürün bulunamadı. Manuel olarak seçebilirsiniz.')
        setActiveTab('manual')
      }
    } catch (error) {
      console.error('AI search error:', error)
      alert('AI arama hatası. Manuel seçim moduna geçiliyor.')
      setActiveTab('manual')
    } finally {
      setSearching(false)
    }
  }

  const handleMultiMatchSelect = (product: Product, match: any) => {
    addItem(product, true, pendingRequest)
    setShowMultiMatchModal(false)
    setMultiMatchResults([])
    setPendingRequest('')
    setCustomerRequest('')
  }

  const handleMultiMatchCancel = () => {
    setShowMultiMatchModal(false)
    setMultiMatchResults([])
    setPendingRequest('')
    // Kullanıcı iptal ederse talep inputunda kalsın
  }

  const handleBatchConfirmAll = (selections: { request: string, product: Product, quantity: number, match: any }[]) => {
    console.log('Batch selections confirmed:', selections)

    // Tüm seçimleri items'a ekle
    const newItems = selections.map(sel => ({
      product: sel.product,
      quantity: sel.quantity,
      discount_percentage: 0,
      ai_matched: true,
      original_request: sel.request
    }))

    setItems(prev => [...prev, ...newItems])
    setShowBatchModal(false)
    setBatchPendingMatches([])

    alert(`${selections.length} ürün başarıyla eklendi!`)
  }

  const handleBatchCancel = () => {
    setShowBatchModal(false)
    setBatchPendingMatches([])
    alert('Belirsiz talepler iptal edildi. Manuel olarak ekleyebilirsiniz.')
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      console.log('Excel Data:', jsonData)

      const newItems: QuotationItem[] = []
      const pendingMultiMatches: any[] = []
      let successCount = 0
      let failCount = 0

      // Her satır için AI ile eşleştir
      for (const row of jsonData) {
        const talep = row['Müşteri Talebi'] || row['talep'] || ''
        const miktar = Number(row['Miktar'] || row['miktar'] || 1)

        console.log('Processing:', { talep, miktar })

        if (talep) {
          try {
            const response = await fetch(MATCH_PRODUCT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({ customerRequest: talep })
            })

            const result = await response.json()
            console.log('AI Result for', talep, ':', result)

            if (result.matched && result.matched.length > 0) {
              // Multi-match kontrolü
              if (result.isMultiMatch && result.matched.length > 1) {
                console.log('Multi-match detected for Excel row:', talep)
                pendingMultiMatches.push({
                  originalRequest: talep,
                  quantity: miktar,
                  matches: result.matched,
                  selectedIndex: null
                })
              } else {
                // Tek ürün varsa direkt ekle
                const match = result.matched[0]
                let product = match.product
                if (!product && match.product_id) {
                  product = products.find(p => p.id === match.product_id)
                }

                if (product && match.confidence > 0.3) {
                  const item: QuotationItem = {
                    product: product,
                    quantity: miktar,
                    discount_percentage: 0,
                    ai_matched: true,
                    original_request: talep
                  }
                  newItems.push(item)
                  successCount++
                } else {
                  failCount++
                  console.log('Product not found or low confidence for:', talep)
                }
              }
            } else {
              failCount++
              console.log('No match for:', talep)
            }
          } catch (err) {
            console.error('Excel AI matching error for', talep, ':', err)
            failCount++
          }
        }
      }

      // Başarılı eşleşmeleri ekle
      if (newItems.length > 0) {
        setItems(prev => [...prev, ...newItems])
      }

      // Multi-match varsa modal aç
      if (pendingMultiMatches.length > 0) {
        console.log('Opening batch modal with', pendingMultiMatches.length, 'pending matches')
        setBatchPendingMatches(pendingMultiMatches)
        setShowBatchModal(true)
      } else {
        alert(`Excel yüklendi!\nBaşarılı: ${successCount}\nBaşarısız: ${failCount}`)
      }
    } catch (error) {
      console.error('Excel upload error:', error)
      alert('Excel yükleme hatası: ' + error)
    }
  }

  const addItem = (product: Product, aiMatched = false, originalRequest = '') => {
    setItems([...items, {
      product,
      quantity: 1,
      discount_percentage: 0,
      ai_matched: aiMatched,
      original_request: originalRequest
    }])
  }

  const handleImageProductsExtracted = async (requests: { talep: string, miktar: number, birim: string }[]) => {
    console.log('Starting image products extraction for', requests.length, 'requests')

    setProcessingProgress({ current: 0, total: requests.length })

    const newItems: QuotationItem[] = []
    const pendingMultiMatches: any[] = []
    const failedRequests: string[] = []
    let successCount = 0
    let failCount = 0
    let completedCount = 0

    const results = await Promise.allSettled(
      requests.map(request =>
        fetch(MATCH_PRODUCT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ customerRequest: request.talep })
        })
          .then(r => r.json())
          .then(result => {
            completedCount++
            setProcessingProgress({ current: completedCount, total: requests.length })
            return { request, result }
          })
      )
    )

    for (const settled of results) {
      if (settled.status === 'rejected') {
        console.error('Image matching error:', settled.reason)
        failCount++
        continue
      }

      const { request, result } = settled.value

      if (result.matched && result.matched.length > 0) {
        if (result.isMultiMatch && result.matched.length > 1) {
          pendingMultiMatches.push({
            originalRequest: request.talep,
            quantity: request.miktar,
            matches: result.matched,
            selectedIndex: null
          })
        } else {
          const match = result.matched[0]
          let product = match.product
          if (!product && match.product_id) {
            product = products.find(p => p.id === match.product_id)
            // Fallback: local state'te yoksa DB'den direkt çek
            if (!product) {
              const { data } = await supabase.from('products').select('*').eq('id', match.product_id).single()
              product = data
            }
          }

          if (product && match.confidence > 0.3) {
            newItems.push({
              product,
              quantity: request.miktar,
              discount_percentage: 0,
              ai_matched: true,
              original_request: `${request.talep} [${request.birim}]`
            })
            successCount++
          } else {
            failCount++
            failedRequests.push(request.talep)
          }
        }
      } else {
        failCount++
        failedRequests.push(request.talep)
      }
    }

    setProcessingProgress(null)
    console.log('Extraction complete. Success:', successCount, 'Failed:', failCount)

    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems])
    }

    if (failedRequests.length > 0) {
      setUnmatchedItems(failedRequests)
    }

    if (pendingMultiMatches.length > 0) {
      setBatchPendingMatches(pendingMultiMatches)
      setShowBatchModal(true)
    }

    const multiMatchCount = pendingMultiMatches.length
    alert(
      `Eşleştirme tamamlandı!\n✓ ${successCount} ürün eşleşti\n` +
      (multiMatchCount > 0 ? `⚠ ${multiMatchCount} belirsiz (seçim gerekiyor)\n` : '') +
      (failCount > 0 ? `✗ ${failCount} bulunamadı` : '')
    )
  }

  const updateItem = (index: number, field: 'quantity' | 'discount_percentage', value: number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateItemTotal = (item: QuotationItem) => {
    if (!item.product) return 0
    const subtotal = (item.product.base_price || 0) * item.quantity
    const discount = subtotal * (item.discount_percentage / 100)
    return subtotal - discount
  }

  const calculateTotalsByCurrency = () => {
    const byCurrency: Record<string, { total: number, discount: number, final: number }> = {}

    items.filter(item => item.product).forEach(item => {
      const currency = item.product.currency || 'TRY'  // Changed from 'TL' to 'TRY'
      if (!byCurrency[currency]) {
        byCurrency[currency] = { total: 0, discount: 0, final: 0 }
      }

      const itemTotal = item.product.base_price * item.quantity
      const itemDiscount = itemTotal * (item.discount_percentage / 100)

      byCurrency[currency].total += itemTotal
      byCurrency[currency].discount += itemDiscount
      byCurrency[currency].final += (itemTotal - itemDiscount)
    })

    return byCurrency
  }

  const calculateTotals = () => {
    // Returns primary currency totals (TRY first, then fallback to TL for legacy, then first available)
    const byCurrency = calculateTotalsByCurrency()

    // Try TRY first (new standard), fallback to TL (legacy), then first available currency
    const primaryTotals = byCurrency['TRY'] ||
                          byCurrency['TL'] ||
                          Object.values(byCurrency)[0] ||
                          { total: 0, discount: 0, final: 0 }

    return primaryTotals
  }

  const handleSave = async () => {
    if (!selectedCompany || items.length === 0) {
      alert('Lütfen firma seçin ve en az bir ürün ekleyin')
      return
    }

    setSaving(true)
    try {
      const totals = calculateTotals()
      const byCurrency = calculateTotalsByCurrency()

      // Get primary currency (first item's currency or TRY)
      const primaryCurrency = items[0]?.product?.currency || 'TRY'

      // Teklif oluştur
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          company_id: selectedCompany,
          quotation_number: '',  // Trigger will auto-generate
          status: 'draft',
          total_amount: totals.total,
          discount_amount: totals.discount,
          final_amount: totals.final,
          currency: primaryCurrency,
          subtotal: totals.total,
          notes: null
        })
        .select()
        .single()

      if (quotationError) {
        console.error('Quotation insert error:', quotationError)
        throw quotationError
      }

      // Validate quotation number was generated
      if (!quotation.quotation_number || quotation.quotation_number === '') {
        throw new Error('Teklif numarası oluşturulamadı')
      }

      // Teklif kalemlerini ekle
      const quotationItems = items.map(item => ({
        quotation_id: quotation.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.base_price,
        currency: item.product.currency,
        discount_percentage: item.discount_percentage,
        discount_amount: (item.product.base_price * item.quantity * item.discount_percentage / 100),
        subtotal: calculateItemTotal(item),
        ai_matched: item.ai_matched || false,
        original_request: item.original_request || null
      }))

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(quotationItems)

      if (itemsError) {
        console.error('Quotation items insert error:', itemsError)
        // Rollback: delete the quotation if items fail
        await supabase.from('quotations').delete().eq('id', quotation.id)
        throw itemsError
      }

      alert(`Teklif başarıyla oluşturuldu! Teklif No: ${quotation.quotation_number}`)

      // Formu sıfırla
      setSelectedCompany('')
      setItems([])
      setCustomerRequest('')

    } catch (error: any) {
      console.error('Save error:', error)
      alert(`Teklif kaydedilirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async () => {
    if (!selectedCompany || items.length === 0) {
      alert('Lütfen firma seçin ve en az bir ürün ekleyin')
      return
    }

    // Get company info
    const company = companies.find(c => c.id === selectedCompany)
    if (!company) {
      alert('Firma bilgisi bulunamadı')
      return
    }

    // Generate preview quotation number
    const previewNumber = `ÖNIZLEME-${new Date().getTime()}`

    try {
      await generateQuotationPDF(
        {
          name: company.name,
          email: null,
          phone: null,
          tax_number: null
        },
        items,
        previewNumber
      )
    } catch (error) {
      console.error('PDF export error:', error)
      alert('PDF oluşturulurken hata oluştu')
    }
  }

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true
    const search = productSearch.toLowerCase()
    return (
      p.product_code.toLowerCase().includes(search) ||
      p.product_type.toLowerCase().includes(search) ||
      (p.diameter && p.diameter.toLowerCase().includes(search))
    )
  })

  const totals = calculateTotals()
  const totalsByCurrency = calculateTotalsByCurrency()

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'TRY':
      case 'TL':
        return '₺'
      case 'USD':
        return '$'
      case 'EUR':
        return '€'
      default:
        return currency
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Yeni Teklif Oluştur</h1>

      {/* Firma Seçimi */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6">
        <h2 className="text-lg font-semibold mb-4">1. Firma Seçin</h2>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg min-h-[44px] text-base"
        >
          <option value="">Firma seçin...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </div>

      {/* Ürün Ekleme Yöntemleri */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6">
        <h2 className="text-lg font-semibold mb-4">2. Ürün Ekle</h2>

        {/* Sekme Butonları */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('ai')}
            className={`
              px-4 sm:px-6 py-3 rounded-lg font-medium whitespace-nowrap min-h-[44px] flex-shrink-0
              transition-colors
              ${activeTab === 'ai'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'}
            `}
          >
            <span className="hidden sm:inline">🤖 AI ile Ara</span>
            <span className="sm:hidden">🤖 AI</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`
              px-4 sm:px-6 py-3 rounded-lg font-medium whitespace-nowrap min-h-[44px] flex-shrink-0
              transition-colors
              ${activeTab === 'manual'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'}
            `}
          >
            <span className="hidden sm:inline">📋 Manuel Seç</span>
            <span className="sm:hidden">📋 Manuel</span>
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`
              px-4 sm:px-6 py-3 rounded-lg font-medium whitespace-nowrap min-h-[44px] flex-shrink-0
              transition-colors
              ${activeTab === 'image'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'}
            `}
          >
            <span className="hidden sm:inline">📷 Görsel Yükle</span>
            <span className="sm:hidden">📷 Görsel</span>
          </button>
        </div>

        {/* AI Arama */}
        {activeTab === 'ai' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                value={customerRequest}
                onChange={(e) => setCustomerRequest(e.target.value)}
                placeholder="Örn: 1/2 inç plastik boru 50 metre"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg min-h-[44px] text-base"
                onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
              />
              <button
                onClick={handleAISearch}
                disabled={searching || !customerRequest.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 active:bg-blue-800 font-medium min-h-[44px] min-w-[120px]"
              >
                {searching ? 'Aranıyor...' : 'AI ile Bul'}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Müşterinin talebini yazın, AI en uygun ürünü bulacak
            </p>

            {/* Excel Yükleme */}
            <div className="mt-4 pt-4 border-t">
              <label className="block text-sm font-medium mb-2">
                veya Excel ile Toplu Talep Yükle
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 file:min-h-[44px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Excel: "Müşteri Talebi" ve "Miktar" sütunları
              </p>
            </div>
          </div>
        )}

        {/* Görsel Yükleme */}
        {activeTab === 'image' && (
          <div>
            <ImageUploadTab
              products={products as any}
              onProductsExtracted={handleImageProductsExtracted}
            />
            {processingProgress && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                ⏳ Ürünler eşleştiriliyor... {processingProgress.current} / {processingProgress.total}
              </div>
            )}
          </div>
        )}

        {/* Manuel Seçim */}
        {activeTab === 'manual' && (
          <div>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Ürün ara (kod, tip, çap)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 min-h-[44px] text-base"
            />

            {/* Desktop Tablo */}
            <div className="hidden lg:block max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3">Kod</th>
                    <th className="text-left p-3">Tip</th>
                    <th className="text-left p-3">Çap</th>
                    <th className="text-right p-3">Fiyat</th>
                    <th className="text-center p-3">Ekle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{product.product_code}</td>
                      <td className="p-3">{product.product_type}</td>
                      <td className="p-3">{product.diameter || '-'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{product.base_price.toFixed(2)}{getCurrencySymbol(product.currency)}</span>
                          {product.base_price === 0 && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded whitespace-nowrap">
                              ⚠️ Fiyat sorunuz
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            addItem(product, false, '')
                            setActiveTab('ai')
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          Ekle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Ürün bulunamadı
                </div>
              )}
            </div>

            {/* Mobil Card View */}
            <div className="lg:hidden max-h-96 overflow-y-auto space-y-3">
              {filteredProducts.map(product => (
                <div key={product.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 active:bg-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{product.product_type}</h3>
                      <p className="text-sm text-gray-600 font-mono mt-1">{product.product_code}</p>
                      {product.diameter && (
                        <p className="text-sm text-gray-600 mt-1">Çap: {product.diameter}</p>
                      )}
                      <div className="font-bold text-gray-900 mt-2 flex items-center gap-2">
                        <span>{product.base_price.toFixed(2)}{getCurrencySymbol(product.currency)}</span>
                        {product.base_price === 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded whitespace-nowrap">
                            ⚠️ Fiyat sorunuz
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addItem(product, false, '')
                        setActiveTab('ai')
                      }}
                      className="ml-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium min-h-[44px] min-w-[80px]"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Ürün bulunamadı
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Teklif Kalemleri */}
      {items.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold mb-4">3. Teklif Kalemleri</h2>

          {/* Desktop Tablo */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Ürün İsmi</th>
                  <th className="text-left py-2 px-2">Kod</th>
                  <th className="text-right py-2 px-2">Birim Fiyatı</th>
                  <th className="text-center py-2 px-2">Miktar</th>
                  <th className="text-center py-2 px-2">İskonto</th>
                  <th className="text-right py-2 px-2">İskonto Birim Fiyat</th>
                  <th className="text-right py-2 px-2">Net Tutar</th>
                  <th className="text-center py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.filter(item => item.product).map((item, index) => {
                  const basePrice = item.product?.base_price || 0
                  const discountedUnitPrice = basePrice * (1 - item.discount_percentage / 100)
                  const netTotal = discountedUnitPrice * item.quantity
                  const curr = item.product?.currency || 'TRY'
                  return (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-2 text-xs leading-tight max-w-[200px]">
                      {item.product?.product_type}{item.product?.diameter ? ` - ${item.product.diameter}` : ''}
                      {item.ai_matched && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AI</span>}
                    </td>
                    <td className="py-2 px-2">{item.product?.product_code}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{basePrice.toFixed(2)}{getCurrencySymbol(curr)}</span>
                        {basePrice === 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded whitespace-nowrap">
                            ⚠️ Fiyat sorunuz
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        min="0.01"
                        step="0.01"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={item.discount_percentage}
                        onChange={(e) => updateItem(index, 'discount_percentage', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        min="0"
                        max="100"
                        step="1"
                      />
                    </td>
                    <td className="py-2 px-2 text-right text-orange-700">
                      {discountedUnitPrice.toFixed(2)}{getCurrencySymbol(curr)}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {netTotal.toFixed(2)}{getCurrencySymbol(curr)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil Card View */}
          <div className="lg:hidden space-y-4">
            {items.filter(item => item.product).map((item, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                {/* Ürün Başlığı */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.product?.product_type}
                      {item.product?.diameter && ` - ${item.product.diameter}`}
                    </h3>
                    <p className="text-sm text-gray-600 font-mono mt-1">
                      {item.product?.product_code}
                    </p>
                    {item.ai_matched && (
                      <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        AI Eşleşti
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="ml-3 text-red-600 p-2 min-w-[44px] min-h-[44px] hover:bg-red-50 rounded-lg active:bg-red-100"
                  >
                    ✕
                  </button>
                </div>

                {/* Fiyat Bilgileri */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <label className="text-gray-600 block mb-1">Birim Fiyatı</label>
                    <div className="font-semibold flex items-center gap-2">
                      <span>{(item.product?.base_price || 0).toFixed(2)}{getCurrencySymbol(item.product?.currency || 'TRY')}</span>
                      {(item.product?.base_price || 0) === 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded whitespace-nowrap">
                          ⚠️ Fiyat sorunuz
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1">İskonto Birim Fiyat</label>
                    <div className="font-semibold text-orange-700">
                      {((item.product?.base_price || 0) * (1 - item.discount_percentage / 100)).toFixed(2)}{getCurrencySymbol(item.product?.currency || 'TRY')}
                    </div>
                  </div>
                </div>
                <div className="mb-3 text-sm">
                  <label className="text-gray-600 block mb-1">Net Tutar</label>
                  <div className="font-bold text-blue-600">
                    {calculateItemTotal(item).toFixed(2)}{getCurrencySymbol(item.product?.currency || 'TRY')}
                  </div>
                </div>

                {/* Miktar & İskonto */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Miktar</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-center min-h-[44px] text-base"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">İskonto %</label>
                    <input
                      type="number"
                      value={item.discount_percentage}
                      onChange={(e) => updateItem(index, 'discount_percentage', Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-center min-h-[44px] text-base"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Eşleşemeyen OCR Satırları */}
          {unmatchedItems.length > 0 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-orange-800">
                  ⚠️ {unmatchedItems.length} satır eşleştirilemedi — manuel ekleyebilirsiniz:
                </h3>
                <button
                  onClick={() => setUnmatchedItems([])}
                  className="text-orange-600 hover:text-orange-800 text-sm"
                >
                  ✕ Kapat
                </button>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-orange-700">
                {unmatchedItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Toplamlar - Para Birimi Bazında */}
          <div className="mt-4 border-t pt-4 flex justify-end">
            <div className="w-full sm:w-96 space-y-4">
              {Object.keys(totalsByCurrency).length > 0 && (
                Object.entries(totalsByCurrency).map(([currency, amounts]) => (
                  <div key={currency} className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-gray-600 mb-2">{currency} Para Birimi</div>
                    <div className="flex justify-between text-sm">
                      <span>Ara Toplam:</span>
                      <span>{amounts.total.toFixed(2)}{getCurrencySymbol(currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600">
                      <span>İskonto:</span>
                      <span>-{amounts.discount.toFixed(2)}{getCurrencySymbol(currency)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>TOPLAM ({currency}):</span>
                      <span>{amounts.final.toFixed(2)}{getCurrencySymbol(currency)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 font-semibold text-lg shadow-md min-h-[56px]"
            >
              {saving ? '⏳ Kaydediliyor...' : '✓ Teklifi Kaydet'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={items.length === 0 || !selectedCompany}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 font-semibold text-lg shadow-md min-h-[56px]"
            >
              📄 PDF İndir
            </button>
          </div>
        </div>
      )}

      {/* Multi-Match Modal (Tek talep için) */}
      <ProductSelectionModal
        isOpen={showMultiMatchModal}
        matches={multiMatchResults}
        message={multiMatchMessage}
        onSelect={handleMultiMatchSelect}
        onCancel={handleMultiMatchCancel}
      />

      {/* Batch Multi-Match Modal (Excel/Görsel için) */}
      <BatchMultiMatchModal
        isOpen={showBatchModal}
        pendingMatches={batchPendingMatches}
        onConfirmAll={handleBatchConfirmAll}
        onCancel={handleBatchCancel}
      />
    </div>
  )
}
