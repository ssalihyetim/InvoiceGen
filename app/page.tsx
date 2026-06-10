'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeStatus } from '@/lib/quotation-status'

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
  const map: Record<string, string> = {
    draft: 'Taslak', sent: 'Gönderildi', approved: 'Onaylandı',
    accepted: 'Kabul', rejected: 'Red', expired: 'Süresi Dolmuş'
  }
  return map[status] || status
}

const statusStyles: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  accepted: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  sent: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  draft: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  expired: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📊 Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Genel bakış ve dönem istatistikleri</p>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 mb-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <span className="text-sm font-medium text-gray-600">📅 Tarih Aralığı:</span>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => { setAppliedStart(startDate); setAppliedEnd(endDate) }}
          className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium transition-colors"
        >
          Uygula
        </button>
        <button
          onClick={() => {
            const s = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
            const e = toDateStr(now)
            setStartDate(s); setEndDate(e); setAppliedStart(s); setAppliedEnd(e)
          }}
          className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
        >
          Bu Ay
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Toplam Ürün</h3>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? <span className="animate-pulse text-gray-300">...</span> : totalProducts?.toLocaleString('tr-TR')}
          </p>
          <p className="text-xs text-gray-400 mt-1">Veritabanındaki ürünler</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Aktif Firmalar</h3>
            <span className="text-2xl">🏢</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? <span className="animate-pulse text-gray-300">...</span> : activeCompanies?.toLocaleString('tr-TR')}
          </p>
          <p className="text-xs text-gray-400 mt-1">Kayıtlı müşteriler</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Dönem Teklif Sayısı</h3>
            <span className="text-2xl">📄</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? <span className="animate-pulse text-gray-300">...</span> : quotations.length.toLocaleString('tr-TR')}
          </p>
          <p className="text-xs text-gray-400 mt-1">{appliedStart} — {appliedEnd}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-indigo-200">Dönem Cirosu</h3>
            <span className="text-2xl">💰</span>
          </div>
          {loading ? (
            <p className="text-3xl font-bold text-white animate-pulse">...</p>
          ) : (
            <div className="space-y-1">
              {Object.keys(periodTotals).length > 0 ? (
                Object.entries(periodTotals).map(([currency, amount]) => (
                  <p key={currency} className="text-2xl font-bold text-white">
                    {formatCurrency(amount, currency)}
                  </p>
                ))
              ) : (
                <p className="text-2xl font-bold text-white">0,00 ₺</p>
              )}
            </div>
          )}
          <p className="text-xs text-indigo-300 mt-1">Toplam satış tutarı</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Conversion Funnel */}
      {!loading && quotations.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Dönüşüm Hunisi</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {(() => {
              const statusCounts = quotations.reduce((acc, q) => {
                const s = normalizeStatus(q.status)
                acc[s] = (acc[s] || 0) + 1
                return acc
              }, {} as Record<string, number>)

              const total = quotations.length
              const stages = [
                { key: 'draft', label: 'Taslak', color: 'bg-amber-500', count: statusCounts['draft'] || 0 },
                { key: 'sent', label: 'Gönderildi', color: 'bg-blue-500', count: statusCounts['sent'] || 0 },
                { key: 'approved', label: 'Onaylandı', color: 'bg-emerald-500', count: statusCounts['approved'] || 0 },
                { key: 'rejected', label: 'Reddedildi', color: 'bg-red-500', count: statusCounts['rejected'] || 0 },
                { key: 'expired', label: 'Süresi Dolmuş', color: 'bg-gray-400', count: statusCounts['expired'] || 0 },
              ]

              return stages.map(stage => (
                <div key={stage.key} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                  <div className="text-xs text-gray-500 mb-2">{stage.label}</div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${stage.color} h-2 rounded-full transition-all`}
                      style={{ width: total > 0 ? `${(stage.count / total) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {total > 0 ? Math.round((stage.count / total) * 100) : 0}%
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Top Customers */}
      {!loading && quotations.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">En İyi Müşteriler</h2>
          <div className="space-y-3">
            {(() => {
              const byCompany: Record<string, { name: string; total: number; count: number }> = {}
              quotations.forEach(q => {
                const name = q.companies?.name || 'Bilinmeyen'
                if (!byCompany[name]) byCompany[name] = { name, total: 0, count: 0 }
                byCompany[name].total += q.final_amount || 0
                byCompany[name].count++
              })
              return Object.values(byCompany)
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">{i + 1}.</span>
                    <span className="flex-1 text-sm font-medium text-gray-800">{c.name}</span>
                    <span className="text-sm text-gray-500">{c.count} teklif</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {c.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
            })()}
          </div>
        </div>
      )}

      {/* Quotations table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            📋 Dönem Teklifleri
          </h2>
          <span className="text-sm text-gray-400">{appliedStart} — {appliedEnd}</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-3xl mb-2 animate-bounce">⏳</div>
            <p>Yükleniyor...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-3xl mb-2">📭</div>
            <p>Bu dönemde teklif bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Tarih</th>
                  <th className="px-6 py-3 text-left font-semibold">Teklif No</th>
                  <th className="px-6 py-3 text-left font-semibold">Firma</th>
                  <th className="px-6 py-3 text-right font-semibold">Tutar</th>
                  <th className="px-6 py-3 text-center font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotations.map(q => (
                  <tr key={q.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-3.5 text-gray-500 text-xs">
                      {new Date(q.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-gray-800">
                      {q.quotation_number || q.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3.5 text-gray-700">
                      {q.companies?.name || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-gray-900">
                      {formatCurrency(q.final_amount || 0, q.currency || 'TRY')}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[q.status] || statusStyles.draft}`}>
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
