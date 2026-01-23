'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Quotation = {
  id: string
  quotation_number: string
  status: string
  final_amount: number
  created_at: string
  companies: {
    name: string
  }
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])

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
        created_at,
        companies (name)
      `)
      .order('created_at', { ascending: false })

    if (data) setQuotations(data as any)
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

      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Teklif No</th>
              <th className="text-left p-4">Firma</th>
              <th className="text-left p-4">Durum</th>
              <th className="text-right p-4">Tutar</th>
              <th className="text-left p-4">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map(quotation => (
              <tr key={quotation.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{quotation.quotation_number}</td>
                <td className="p-4">{quotation.companies.name}</td>
                <td className="p-4">{getStatusBadge(quotation.status)}</td>
                <td className="p-4 text-right font-semibold">{quotation.final_amount.toFixed(2)} ₺</td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(quotation.created_at).toLocaleDateString('tr-TR')}
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
