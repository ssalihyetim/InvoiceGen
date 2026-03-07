'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Quotation {
  id: string
  quotation_number: string
  final_amount: number
  currency: string
  created_at: string
  status: string
  companies: { name: string } | null
}

function toDateStr(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'TRY' || currency === 'TL' ? '₺' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
}

function statusLabel(status: string) {
  const map: Record<string, string> = { draft: 'Taslak', sent: 'Gönderildi', accepted: 'Kabul', rejected: 'Red' }
  return map[status] || status
}

export default function Home() {
  const now = new Date()
  const defaultStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const defaultEnd = toDateStr(now)

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [appliedStart, setAppliedStart] = useState(defaultStart)
  const [appliedEnd, setAppliedEnd] = useState(defaultEnd)

  const [totalProducts, setTotalProducts] = useState<number | null>(null)
  const [activeCompanies, setActiveCompanies] = useState<number | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData(appliedStart, appliedEnd)
  }, [appliedStart, appliedEnd])

  const loadData = async (start: string, end: string) => {
    try {
      setLoading(true)
      setError(null)

      const [productsRes, companiesRes, quotationsRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase
          .from('quotations')
          .select('id, quotation_number, final_amount, currency, created_at, status, companies(name)')
          .gte('created_at', start + 'T00:00:00')
          .lte('created_at', end + 'T23:59:59')
          .order('created_at', { ascending: false }),
      ])

      if (productsRes.error) throw productsRes.error
      if (companiesRes.error) throw companiesRes.error
      if (quotationsRes.error) throw quotationsRes.error

      setTotalProducts(productsRes.count || 0)
      setActiveCompanies(companiesRes.count || 0)
      setQuotations((quotationsRes.data as Quotation[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const periodTotals = quotations.reduce((acc, q) => {
    const c = q.currency || 'TRY'
    acc[c] = (acc[c] || 0) + (q.final_amount || 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <label className="text-sm font-medium text-gray-600">Tarih Aralığı:</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => { setAppliedStart(startDate); setAppliedEnd(endDate) }}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Uygula
        </button>
        <button
          onClick={() => {
            const s = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
            const e = toDateStr(now)
            setStartDate(s); setEndDate(e); setAppliedStart(s); setAppliedEnd(e)
          }}
          className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
        >
          Bu Ay
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Toplam Ürün</h3>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? <span className="animate-pulse">...</span> : totalProducts?.toLocaleString('tr-TR')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Aktif Firmalar</h3>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? <span className="animate-pulse">...</span> : activeCompanies?.toLocaleString('tr-TR')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Dönem Teklif Sayısı</h3>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? <span className="animate-pulse">...</span> : quotations.length.toLocaleString('tr-TR')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Dönem Cirosu</h3>
          {loading ? (
            <p className="text-3xl font-bold text-gray-800 animate-pulse">...</p>
          ) : (
            <div className="space-y-1">
              {Object.keys(periodTotals).length > 0 ? (
                Object.entries(periodTotals).map(([currency, amount]) => (
                  <p key={currency} className="text-2xl font-bold text-gray-800">
                    {formatCurrency(amount, currency)}
                  </p>
                ))
              ) : (
                <p className="text-2xl font-bold text-gray-800">0.00 ₺</p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Quotations table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Dönem Teklifleri
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({appliedStart} — {appliedEnd})
            </span>
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : quotations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Bu dönemde teklif bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Tarih</th>
                  <th className="px-6 py-3 text-left">Teklif No</th>
                  <th className="px-6 py-3 text-left">Firma</th>
                  <th className="px-6 py-3 text-right">Tutar</th>
                  <th className="px-6 py-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotations.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(q.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {q.quotation_number || q.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {q.companies?.name || '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-800">
                      {formatCurrency(q.final_amount || 0, q.currency || 'TRY')}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        q.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        q.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        q.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {statusLabel(q.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
