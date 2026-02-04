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
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null)

  useEffect(() => {
    loadQuotations()
  }, [])

  const loadQuotations = async () => {
    const { data } = await supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        status,
        final_amount,
        currency,
        created_at,
        companies (name)
      `)
      .order('created_at', { ascending: false })

    if (data) setQuotations(data as any)
  }

  const handleDownloadPDF = async (quotationId: string, quotationNumber: string) => {
    try {
      setLoadingPdf(quotationId)

      // Fetch full quotation data with items and products
      const { data: quotation, error } = await supabase
        .from('quotations')
        .select(`
          quotation_number,
          companies (
            name,
            email,
            phone,
            tax_number
          ),
          quotation_items (
            quantity,
            discount_percentage,
            original_request,
            products (
              product_code,
              product_type,
              diameter,
              base_price,
              currency,
              unit
            )
          )
        `)
        .eq('id', quotationId)
        .single()

      if (error) throw error

      if (!quotation) {
        alert('Teklif bulunamadı')
        return
      }

      // Transform data to match PDF generator types
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

      // Generate PDF
      generateQuotationPDF(companyInfo, items, quotation.quotation_number)

    } catch (error) {
      console.error('PDF generation error:', error)
      alert('PDF oluşturulurken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    } finally {
      setLoadingPdf(null)
    }
  }

  const handleDelete = async (quotationId: string, quotationNumber: string) => {
    if (!confirm(`"${quotationNumber}" teklifi SİLİNECEK! Emin misiniz?\n\nBu işlem geri alınamaz.`)) {
      return
    }

    try {
      // Delete quotation (quotation_items will be cascade deleted)
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId)

      if (error) throw error

      alert('Teklif başarıyla silindi')
      loadQuotations() // Reload list
    } catch (error) {
      console.error('Delete error:', error)
      alert('Teklif silinirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    }
  }

  const handleEdit = (quotationId: string) => {
    window.location.href = `/quotations/${quotationId}/edit`
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }

    const labels = {
      draft: 'Taslak',
      sent: 'Gönderildi',
      approved: 'Onaylandı',
      rejected: 'Reddedildi'
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Teklifler</h1>
        <Link
          href="/quotations/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Yeni Teklif
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Teklif No</th>
              <th className="text-left p-4">Firma</th>
              <th className="text-left p-4">Durum</th>
              <th className="text-right p-4">Tutar</th>
              <th className="text-left p-4">Tarih</th>
              <th className="text-center p-4">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map(quotation => (
              <tr key={quotation.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{quotation.quotation_number}</td>
                <td className="p-4">{quotation.companies.name}</td>
                <td className="p-4">{getStatusBadge(quotation.status)}</td>
                <td className="p-4 text-right font-semibold">
                  {(quotation.final_amount || 0).toFixed(2)} {getCurrencySymbol(quotation.currency || 'TRY')}
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(quotation.created_at).toLocaleDateString('tr-TR')}
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleDownloadPDF(quotation.id, quotation.quotation_number)}
                      disabled={loadingPdf === quotation.id}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title="PDF İndir"
                    >
                      {loadingPdf === quotation.id ? '...' : '📄 PDF'}
                    </button>
                    <button
                      onClick={() => handleEdit(quotation.id)}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                      title="Düzenle"
                    >
                      ✏️ Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(quotation.id, quotation.quotation_number)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      title="Sil"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Henüz teklif oluşturulmamış
          </div>
        )}
      </div>
    </div>
  )
}
