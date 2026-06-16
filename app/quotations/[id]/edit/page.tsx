'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useParams, useRouter } from 'next/navigation'
import { readWorkbook } from '@/lib/excel'
import ImageUploadTab from '@/components/quotations/ImageUploadTab'
import ProductSelectionModal from '@/components/quotations/ProductSelectionModal'
import BatchMultiMatchModal from '@/components/quotations/BatchMultiMatchModal'
import { generateQuotationPDF } from '@/lib/pdf-generator'
import { useAuth } from '@/lib/auth-context'
import {
  totalsByCurrency as sumByCurrency,
  getPrimaryTotals,
  getCurrencySymbol,
  lineNet,
  discountedUnitPrice,
  discountPercentFromTargetUnitPrice,
  CONFIDENCE_THRESHOLD,
} from '@/lib/pricing'
import ManualProductModal, { type ManualProductInput } from '@/components/quotations/ManualProductModal'
import PriceSyncModal from '@/components/quotations/PriceSyncModal'
import RecordHistoryModal from '@/components/audit/RecordHistoryModal'
import {
  type QuoteLineItem,
  type EditedCatalogPrice,
  effectiveUnitPrice,
  toPriceLine,
  makeManualProduct,
  buildQuotationItemRows,
  getEditedCatalogPrices,
} from '@/lib/quote-items'

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
  product_code: string | null
  base_price: number
  currency: string | null
  unit: string | null
  description: string | null
}

// Line item model shared with the new-quotation page (lib/quote-items).
type QuotationItem = QuoteLineItem

export default function EditQuotationPage() {
  const supabase = createSupabaseBrowserClient()
  const { tenantId } = useAuth()
  const params = useParams()
  const router = useRouter()
  const quotationId = params?.id as string

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [customerRequest, setCustomerRequest] = useState('')
  const [items, setItems] = useState<QuotationItem[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quotationNumber, setQuotationNumber] = useState('')

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

  // F1: manuel (katalog dışı) ürün ekleme modalı
  const [showManualModal, setShowManualModal] = useState(false)

  // F3: liste fiyatı değişikliklerini Ana Listeye kaydetme onayı
  const [priceSyncChanges, setPriceSyncChanges] = useState<EditedCatalogPrice[]>([])
  const [showPriceSyncModal, setShowPriceSyncModal] = useState(false)

  // F4/F5: teklif aktivite & sürüm geçmişi
  const [showHistory, setShowHistory] = useState(false)

  // Load companies and products
  useEffect(() => {
    loadCompanies()
    loadProducts()
  }, [])

  // Load existing quotation data
  useEffect(() => {
    if (quotationId) {
      loadExistingQuotation(quotationId)
    }
  }, [quotationId])

  const loadCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')

    if (data) setCompanies(data)
  }

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('product_code')

    if (data) setProducts(data)
  }

  const loadExistingQuotation = async (id: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          id,
          quotation_number,
          company_id,
          status,
          quotation_items (
            id,
            quantity,
            discount_percentage,
            original_request,
            unit_price,
            currency,
            manual_name,
            manual_code,
            manual_unit,
            products (
              id,
              product_type,
              diameter,
              product_code,
              base_price,
              currency,
              unit,
              description
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setQuotationNumber(data.quotation_number)
        setSelectedCompany(data.company_id ?? '')

        // Transform quotation_items to in-memory items. Manual (off-catalog) rows have no
        // joined product → rebuild a synthetic one. For catalog rows, preserve the price
        // that was quoted (unit_price) via an override so catalog drift doesn't change it,
        // without flagging it as a fresh edit (price_edited stays false).
        const loadedItems: QuotationItem[] = data.quotation_items.map((item: any) => {
          if (!item.products) {
            return {
              product: makeManualProduct({
                name: item.manual_name || 'Manuel ürün',
                code: item.manual_code || '',
                unit: item.manual_unit || 'adet',
                price: item.unit_price ?? 0,
                currency: item.currency || 'EUR',
              }),
              quantity: item.quantity,
              discount_percentage: item.discount_percentage,
              ai_matched: false,
              original_request: item.original_request || '',
              manual: true,
            }
          }
          return {
            product: item.products,
            quantity: item.quantity,
            discount_percentage: item.discount_percentage,
            ai_matched: false,
            original_request: item.original_request || '',
            unit_price_override: item.unit_price ?? null,
            price_edited: false,
          }
        })

        setItems(loadedItems)
      }
    } catch (error) {
      console.error('Load quotation error:', error)
      alert('Teklif yüklenirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
      router.push('/quotations')
    } finally {
      setLoading(false)
    }
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

        if (product && match.confidence > CONFIDENCE_THRESHOLD) {
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

    // Seçilen ürünleri ekle
    const newItems = selections.map(sel => ({
      product: sel.product,
      quantity: sel.quantity,
      discount_percentage: 0,
      ai_matched: true,
      original_request: sel.request
    }))

    setItems(prev => [...prev, ...newItems])

    // Kısmi onay: seçilmeyen belirsiz talepleri atla ama kullanıcıya bildir (kaybolduğu sanılmasın).
    const selectedRequests = new Set(selections.map(s => s.request))
    const skipped = batchPendingMatches
      .filter(pm => !selectedRequests.has(pm.originalRequest))
      .map(pm => pm.originalRequest)

    setShowBatchModal(false)
    setBatchPendingMatches([])

    alert(
      `${selections.length} ürün eklendi.` +
      (skipped.length > 0
        ? `\n${skipped.length} talep atlandı (manuel ekleyebilirsiniz):\n• ${skipped.join('\n• ')}`
        : '')
    )
  }

  const handleBatchCancel = () => {
    const skipped = batchPendingMatches.map(pm => pm.originalRequest)
    setShowBatchModal(false)
    setBatchPendingMatches([])
    if (skipped.length > 0) {
      alert(`${skipped.length} belirsiz talep atlandı (manuel ekleyebilirsiniz):\n• ${skipped.join('\n• ')}`)
    }
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = await readWorkbook(data)
      const jsonData = workbook.sheetToJson(workbook.sheetNames[0])

      console.log('Excel Data:', jsonData)

      const newItems: QuotationItem[] = []
      const pendingMultiMatches: any[] = []
      let successCount = 0
      let failCount = 0

      // Tüm satırları paralel eşleştir (sıralı await: N satır = N ardışık RTT idi)
      const rows = jsonData
        .map(row => ({
          talep: String(row['Müşteri Talebi'] || row['talep'] || ''),
          miktar: Number(row['Miktar'] || row['miktar'] || 1),
        }))
        .filter(r => r.talep)

      const results = await Promise.allSettled(
        rows.map(({ talep }) =>
          fetch(MATCH_PRODUCT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ customerRequest: talep })
          }).then(r => r.json())
        )
      )

      results.forEach((settled, i) => {
        const { talep, miktar } = rows[i]

        if (settled.status === 'rejected') {
          console.error('Excel AI matching error for', talep, ':', settled.reason)
          failCount++
          return
        }

        const result = settled.value
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

            if (product && match.confidence > CONFIDENCE_THRESHOLD) {
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
      })

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

  // F1: add an off-catalog (manual) item from the modal.
  const addManualItem = (input: ManualProductInput) => {
    const product = makeManualProduct({
      name: input.name,
      code: input.code,
      unit: input.unit,
      price: input.price,
      currency: input.currency,
    })
    setItems(prev => [...prev, {
      product,
      quantity: 1,
      discount_percentage: 0,
      ai_matched: false,
      original_request: '',
      manual: true,
      add_to_catalog: input.addToCatalog,
    }])
    setShowManualModal(false)
  }

  const handleImageProductsExtracted = async (requests: { talep: string, miktar: number }[]) => {
    console.log('Starting image products extraction for', requests.length, 'requests')

    const newItems: QuotationItem[] = []
    const pendingMultiMatches: any[] = []
    let successCount = 0
    let failCount = 0

    // Tüm talepleri paralel eşleştir (yeni teklif sayfasındaki desenle aynı)
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
          .then(result => ({ request, result }))
      )
    )

    for (const settled of results) {
      if (settled.status === 'rejected') {
        console.error('Image OCR AI matching error:', settled.reason)
        failCount++
        continue
      }

      const { request, result } = settled.value
      console.log('AI result for', request.talep, ':', result)

      if (result.matched && result.matched.length > 0) {
        // Multi-match kontrolü
        if (result.isMultiMatch && result.matched.length > 1) {
          console.log('Multi-match detected for image request:', request.talep)
          pendingMultiMatches.push({
            originalRequest: request.talep,
            quantity: request.miktar,
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

          if (product && match.confidence > CONFIDENCE_THRESHOLD) {
            newItems.push({
              product,
              quantity: request.miktar,
              discount_percentage: 0,
              ai_matched: true,
              original_request: request.talep
            })
            successCount++
            console.log('✓ Matched:', product.product_code)
          } else {
            failCount++
            console.log('✗ Low confidence or no product')
          }
        }
      } else {
        failCount++
        console.log('✗ No match found')
      }
    }

    console.log('Extraction complete. Success:', successCount, 'Failed:', failCount)

    // Başarılı eşleşmeleri ekle
    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems])
    }

    // Multi-match varsa modal aç
    if (pendingMultiMatches.length > 0) {
      console.log('Opening batch modal with', pendingMultiMatches.length, 'pending matches from image')
      setBatchPendingMatches(pendingMultiMatches)
      setShowBatchModal(true)
    }

    // Sadece bir kere alert göster
    return Promise.resolve()
  }

  const patchItem = (index: number, patch: Partial<QuotationItem>) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const updateItem = (index: number, field: 'quantity' | 'discount_percentage', value: number) =>
    patchItem(index, { [field]: value })

  // F2: toggle the per-line price lock; unlocking lets the user edit the list price inline.
  const togglePriceLock = (index: number) =>
    patchItem(index, { price_unlocked: !items[index]?.price_unlocked })

  // F2: inline-edit the list (unit) price of a line.
  const setLinePrice = (index: number, value: number) =>
    patchItem(index, { unit_price_override: value, price_edited: true })

  // F6: type a target discounted (net) unit price; back-compute the discount percentage.
  const setLineTargetNetPrice = (index: number, target: number) => {
    const item = items[index]
    if (!item) return
    patchItem(index, {
      discount_percentage: discountPercentFromTargetUnitPrice(effectiveUnitPrice(item), target),
    })
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Money math lives in lib/pricing.ts; toPriceLine respects an inline price edit (F2).
  const calculateItemTotal = (item: QuotationItem) => lineNet(toPriceLine(item))
  const calculateTotalsByCurrency = () =>
    sumByCurrency(items.filter(item => item.product).map(toPriceLine))
  const calculateTotals = () => getPrimaryTotals(calculateTotalsByCurrency())

  // Entry point: validate, confirm, then (F3) ask about catalog price sync if any list
  // price was edited; otherwise save straight away.
  const handleSave = () => {
    if (!selectedCompany || items.length === 0) {
      alert('Lütfen firma seçin ve en az bir ürün ekleyin')
      return
    }
    if (!tenantId) {
      alert('Oturum bilgisi henüz yüklenmedi, lütfen tekrar deneyin')
      return
    }
    if (!confirm(`"${quotationNumber}" teklifi GÜNCELLENECEK! Devam etmek istiyor musunuz?`)) {
      return
    }
    const edited = getEditedCatalogPrices(items)
    if (edited.length > 0) {
      setPriceSyncChanges(edited)
      setShowPriceSyncModal(true)
      return
    }
    doSave(false)
  }

  const doSave = async (syncToCatalog: boolean) => {
    setShowPriceSyncModal(false)
    if (!tenantId) return

    setSaving(true)
    try {
      // F3: optionally push edited list prices back to the catalog (audit-logged by trigger).
      if (syncToCatalog) {
        for (const change of priceSyncChanges) {
          const { error } = await (supabase.from('products') as any)
            .update({ base_price: change.newPrice })
            .eq('id', change.product_id)
          if (error) throw error
        }
      }

      // F1: optionally add freshly-created manual items to the catalog (best effort).
      const catalogInserts = items
        .filter(it => it.manual && it.add_to_catalog && it.product.product_type.trim())
        .map((it, i) => ({
          product_type: it.product.product_type.trim(),
          diameter: it.product.diameter,
          product_code: it.product.product_code || `MANUEL-${Date.now()}-${i}`,
          base_price: effectiveUnitPrice(it),
          currency: it.product.currency,
          unit: it.product.unit || 'adet',
          description: it.product.description,
          tenant_id: tenantId,
        }))
      if (catalogInserts.length > 0) {
        const { error: catErr } = await (supabase.from('products') as any).insert(catalogInserts)
        if (catErr) console.warn('Manuel ürün kataloğa eklenemedi:', catErr.message)
      }

      const totals = calculateTotals()
      const primaryCurrency = items[0]?.product?.currency || 'TRY'

      // 1. Delete old quotation_items
      const { error: deleteError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', quotationId)

      if (deleteError) throw deleteError

      // 2. Update quotation
      const { error: updateError } = await supabase
        .from('quotations')
        .update({
          company_id: selectedCompany,
          status: 'draft',
          total_amount: totals.total,
          discount_amount: totals.discount,
          final_amount: totals.final,
          currency: primaryCurrency,
          subtotal: totals.total,
          updated_at: new Date().toISOString()
        })
        .eq('id', quotationId)

      if (updateError) throw updateError

      // 3. Insert new quotation_items (manuel + fiyatı düzenlenmiş kalemler dâhil)
      const quotationItems = buildQuotationItemRows(items, { quotationId, tenantId })

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(quotationItems)

      if (itemsError) throw itemsError

      // F5: write a version snapshot (best effort — never blocks the save).
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: lastV } = await supabase
          .from('quotation_versions')
          .select('version_number')
          .eq('quotation_id', quotationId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle()
        const nextVersion = ((lastV?.version_number as number | undefined) ?? 0) + 1
        await (supabase.from('quotation_versions') as any).insert({
          quotation_id: quotationId,
          version_number: nextVersion,
          changed_by: user?.id ?? null,
          snapshot: {
            company_id: selectedCompany,
            currency: primaryCurrency,
            totals,
            items: quotationItems,
          },
        })
      } catch (vErr: any) {
        console.warn('Sürüm snapshot yazılamadı:', vErr?.message)
      }

      alert(`Teklif başarıyla güncellendi! Teklif No: ${quotationNumber}`)
      router.push('/quotations')

    } catch (error: any) {
      console.error('Save error:', error)
      alert(`Teklif güncellenirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
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

    try {
      // Reflect inline price edits (F2) in the PDF by snapshotting the effective price.
      const pdfItems = items
        .filter(i => i.product)
        .map(i => ({ ...i, product: { ...i.product, base_price: effectiveUnitPrice(i) } }))

      await generateQuotationPDF(
        {
          name: company.name,
          email: null,
          phone: null,
          tax_number: null
        },
        pdfItems,
        quotationNumber || `ÖNIZLEME-${new Date().getTime()}`
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
      (p.product_code ?? '').toLowerCase().includes(search) ||
      p.product_type.toLowerCase().includes(search) ||
      (p.diameter && p.diameter.toLowerCase().includes(search))
    )
  })

  const totals = calculateTotals()
  const totalsByCurrency = calculateTotalsByCurrency()


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Teklif yükleniyor...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Teklif Düzenle</h1>
          <p className="text-gray-600 mt-2">Teklif No: <span className="font-semibold">{quotationNumber}</span></p>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap min-h-[44px]"
          title="Bu teklifin aktivite ve sürüm geçmişi"
        >
          🕘 Aktivite / Geçmiş
        </button>
      </div>

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
          <ImageUploadTab
            products={products as any}
            onProductsExtracted={handleImageProductsExtracted}
          />
        )}

        {/* Manuel Seçim */}
        {activeTab === 'manual' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Ürün ara (kod, tip, çap)..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg min-h-[44px] text-base"
              />
              <button
                onClick={() => setShowManualModal(true)}
                className="w-full sm:w-auto px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 font-medium min-h-[44px] whitespace-nowrap"
              >
                ➕ Manuel ürün (listede yok)
              </button>
            </div>

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
                  <th className="text-left py-2 px-2">Ürün</th>
                  <th className="text-left py-2 px-2">Kod</th>
                  <th className="text-right py-2 px-2">Birim Fiyat</th>
                  <th className="text-center py-2 px-2">Miktar</th>
                  <th className="text-center py-2 px-2">İskonto %</th>
                  <th className="text-right py-2 px-2">İskonto Birim Fiyat</th>
                  <th className="text-right py-2 px-2">Toplam</th>
                  <th className="text-center py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.filter(item => item.product).map((item, index) => {
                  const listPrice = effectiveUnitPrice(item)
                  const catalogPrice = item.product?.base_price ?? 0
                  const netUnit = discountedUnitPrice(listPrice, item.discount_percentage)
                  const curr = item.product?.currency || 'TL'
                  const priceChanged = !item.manual && item.price_edited && listPrice !== catalogPrice
                  return (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-2">
                      {item.product?.product_type}{item.product?.diameter ? ` - ${item.product.diameter}` : ''}
                      {item.manual && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Manuel</span>}
                      {item.ai_matched && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AI</span>}
                    </td>
                    <td className="py-2 px-2">{item.product?.product_code}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.price_unlocked ? (
                          <input
                            type="number"
                            value={listPrice}
                            onChange={(e) => setLinePrice(index, Number(e.target.value))}
                            className="w-24 px-2 py-1 border border-blue-400 rounded text-right"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          <span className={priceChanged ? 'text-blue-700 font-medium' : ''}>
                            {listPrice.toFixed(2)}{getCurrencySymbol(curr)}
                          </span>
                        )}
                        {priceChanged && !item.price_unlocked && (
                          <span className="text-xs text-gray-400 line-through">{catalogPrice.toFixed(2)}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePriceLock(index)}
                          title={item.price_unlocked ? 'Fiyatı kilitle' : 'Fiyatı düzenle'}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          {item.price_unlocked ? '🔓' : '🔒'}
                        </button>
                        {listPrice === 0 && (
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
                    <td className="py-2 px-2">
                      <input
                        key={`net-${index}-${item.discount_percentage}-${listPrice}`}
                        type="number"
                        defaultValue={netUnit.toFixed(2)}
                        onBlur={(e) => setLineTargetNetPrice(index, Number(e.target.value))}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        title="Hedef iskontolu birim fiyat — iskonto otomatik hesaplanır"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-orange-700"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {calculateItemTotal(item).toFixed(2)}{getCurrencySymbol(curr)}
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
                    <div className="flex gap-1 mt-2">
                      {item.manual && (
                        <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Manuel
                        </span>
                      )}
                      {item.ai_matched && (
                        <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          AI Eşleşti
                        </span>
                      )}
                    </div>
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
                    <label className="text-gray-600 flex items-center justify-between mb-1">
                      <span>Birim Fiyat</span>
                      <button
                        type="button"
                        onClick={() => togglePriceLock(index)}
                        className="text-gray-500 hover:text-blue-600"
                        title={item.price_unlocked ? 'Fiyatı kilitle' : 'Fiyatı düzenle'}
                      >
                        {item.price_unlocked ? '🔓' : '🔒'}
                      </button>
                    </label>
                    {item.price_unlocked ? (
                      <input
                        type="number"
                        value={effectiveUnitPrice(item)}
                        onChange={(e) => setLinePrice(index, Number(e.target.value))}
                        className="w-full px-3 py-2 border border-blue-400 rounded-lg text-right min-h-[44px] text-base"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <div className="font-semibold flex items-center gap-2">
                        <span>{effectiveUnitPrice(item).toFixed(2)}{getCurrencySymbol(item.product?.currency || 'TL')}</span>
                        {effectiveUnitPrice(item) === 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded whitespace-nowrap">
                            ⚠️ Fiyat sorunuz
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1">İskonto Birim Fiyat</label>
                    <input
                      key={`mnet-${index}-${item.discount_percentage}-${effectiveUnitPrice(item)}`}
                      type="number"
                      defaultValue={discountedUnitPrice(effectiveUnitPrice(item), item.discount_percentage).toFixed(2)}
                      onBlur={(e) => setLineTargetNetPrice(index, Number(e.target.value))}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      className="w-full px-3 py-2 border rounded-lg text-right min-h-[44px] text-base text-orange-700"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="mb-3 text-sm">
                  <label className="text-gray-600 block mb-1">Toplam</label>
                  <div className="font-bold text-blue-600">
                    {calculateItemTotal(item).toFixed(2)}{getCurrencySymbol(item.product?.currency || 'TL')}
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
              {saving ? '⏳ Güncelleniyor...' : '✓ Değişiklikleri Kaydet'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={items.length === 0 || !selectedCompany}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 font-semibold text-lg shadow-md min-h-[56px]"
            >
              📄 PDF Önizle
            </button>
            <button
              onClick={() => router.push('/quotations')}
              className="w-full sm:w-auto px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:bg-gray-800 font-semibold text-lg shadow-md min-h-[56px]"
            >
              ← Geri Dön
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

      {/* F1: Manuel ürün ekleme modalı */}
      <ManualProductModal
        isOpen={showManualModal}
        onAdd={addManualItem}
        onCancel={() => setShowManualModal(false)}
      />

      {/* F3: Liste fiyatı → Ana Liste senkronizasyon onayı */}
      <PriceSyncModal
        isOpen={showPriceSyncModal}
        changes={priceSyncChanges}
        saving={saving}
        onConfirm={() => doSave(true)}
        onSkip={() => doSave(false)}
        onCancel={() => setShowPriceSyncModal(false)}
      />

      {/* F4/F5: Teklif aktivite & sürüm geçmişi */}
      {showHistory && quotationId && (
        <RecordHistoryModal
          isOpen={showHistory}
          entityType="quotations"
          entityId={quotationId}
          title={`Teklif No: ${quotationNumber}`}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
