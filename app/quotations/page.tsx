'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { generateQuotationPDF } from '@/lib/pdf-generator'

type Quotation = {
  id: string
  quotation_number: string
  status: string
  final_amount: number
  currency: string
  created_at: string
  companies: {
    name: string
  }
  quotation_items: {
    quantity: number
    unit_price: number
    currency: string
    discount_percentage: number
  }[]
}

type Toast = { type: 'success' | 'error'; message: string }

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  sent: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  approved: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-red-100 text-red-700 ring-1 ring-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
}

function getCurrencySymbol(currency: string) {
  if (currency === 'TRY' || currency === 'TL') return '₺'
  if (currency === 'USD') return '$'
  if (currency === 'EUR') return '€'
  return currency
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    loadQuotations()
  }, [])

  const loadQuotations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        status,
        final_amount,
        currency,
        created_at,
        companies (name),
        quotation_items (
          quantity,
          unit_price,
          currency,
          discount_percentage
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      showToast('error', 'Teklifler yüklenirken hata oluştu: ' + error.message)
    } else if (data) {
      setQuotations(data as any)
    }
    setLoading(false)
  }

  const calculateTotalsByCurrency = (quotation: Quotation) => {
    const byCurrency: Record<string, number> = {}
    quotation.quotation_items?.forEach(item => {
      const currency = item.currency || 'TRY'
      const subtotal = item.unit_price * item.quantity
      const discount = subtotal * (item.discount_percentage / 100)
      byCurrency[currency] = (byCurrency[currency] || 0) + (subtotal - discount)
    })
    return byCurrency
  }

  const handleDownloadPDF = async (quotationId: string, quotationNumber: string) => {
    try {
      setLoadingPdf(quotationId)

      const { data: quotation, error } = await supabase
        .from('quotations')
        .select(`
          quotation_number,
          companies (name, email, phone, tax_number),
          quotation_items (
            quantity,
            discount_percentage,
            original_request,
            products (product_code, product_type, diameter, base_price, currency, unit)
          )
        `)
        .eq('id', quotationId)
        .single()

      if (error) throw error
      if (!quotation) throw new Error('Teklif bulunamadı')

      const companyInfo = {
        name: quotation.companies.name,
        email: quotation.companies.email,
        phone: quotation.companies.phone,
        tax_number: quotation.companies.tax_number
      }

      const items = quotation.quotation_items.map((item: any) => ({
        product: {
          product_code: item.products.product_code,
          product_type: item.products.product_type,
          diameter: item.products.diameter,
          base_price: item.products.base_price,
          currency: item.products.currency,
          unit: item.products.unit
        },
        quantity: item.quantity,
        discount_percentage: item.discount_percentage,
        original_request: item.original_request
      }))

      await generateQuotationPDF(companyInfo, items, quotation.quotation_number)
      showToast('success', `${quotationNumber} PDF olarak indirildi.`)
    } catch (error) {
      console.error('PDF generation error:', error)
      showToast('error', 'PDF oluşturulurken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    } finally {
      setLoadingPdf(null)
    }
  }

  const handleDelete = async (quotationId: string, quotationNumber: string) => {
    if (!confirm(`"${quotationNumber}" teklifi SİLİNECEK! Bu işlem geri alınamaz.`)) return

    const { error } = await supabase.from('quotations').delete().eq('id', quotationId)
    if (error) {
      showToast('error', 'Teklif silinirken hata oluştu: ' + error.message)
    } else {
      showToast('success', `"${quotationNumber}" silindi.`)
      loadQuotations()
    }
  }

  return (
    <div className="relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📄 Teklifler</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Yükleniyor...' : `${quotations.length} teklif`}
          </p>
        </div>
        <Link
          href="/quotations/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm transition-colors"
        >
          + Yeni Teklif
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-3xl mb-2 animate-bounce">⏳</div>
            <p>Yükleniyor...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium text-gray-600 mb-1">Henüz teklif oluşturulmamış</p>
            <p className="text-sm mb-4">İlk teklifinizi oluşturmak için aşağıdaki butona tıklayın.</p>
            <Link href="/quotations/new" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              + Yeni Teklif Oluştur
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teklif No</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Firma</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tutar</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotations.map(quotation => {
                  const totals = calculateTotalsByCurrency(quotation)
                  const currencies = Object.keys(totals)

                  return (
                    <tr key={quotation.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-gray-900">{quotation.quotation_number}</td>
                      <td className="px-5 py-3.5 text-gray-700">{quotation.companies?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[quotation.status] || STATUS_STYLES.draft}`}>
                          {STATUS_LABELS[quotation.status] || quotation.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                        {currencies.length === 0 ? (
                          <span>{(quotation.final_amount || 0).toFixed(2)} {getCurrencySymbol(quotation.currency || 'TRY')}</span>
                        ) : currencies.length === 1 ? (
                          <span>{totals[currencies[0]].toFixed(2)} {getCurrencySymbol(currencies[0])}</span>
                        ) : (
                          <div className="flex flex-col gap-0.5 items-end">
                            {currencies.map(c => (
                              <span key={c} className="text-xs">{totals[c].toFixed(2)} {getCurrencySymbol(c)}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {new Date(quotation.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5 justify-center flex-wrap">
                          <button
                            onClick={() => handleDownloadPDF(quotation.id, quotation.quotation_number)}
                            disabled={loadingPdf === quotation.id}
                            className="px-3 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                          >
                            {loadingPdf === quotation.id ? '⏳' : '📄'} PDF
                          </button>
                          <button
                            onClick={() => window.location.href = `/quotations/${quotation.id}/edit`}
                            className="px-3 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            ✏️ Düzenle
                          </button>
                          <button
                            onClick={() => handleDelete(quotation.id, quotation.quotation_number)}
                            className="px-3 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            🗑️ Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
