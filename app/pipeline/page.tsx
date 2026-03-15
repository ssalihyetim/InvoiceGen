'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type Quotation = {
  id: string
  quotation_number: string
  final_amount: number
  currency: string
  status: string
  valid_until: string | null
  created_at: string
  companies: { name: string } | null
}

const COLUMNS = [
  { key: 'draft', label: 'Taslak', color: 'border-amber-300 bg-amber-50' },
  { key: 'sent', label: 'Gönderildi', color: 'border-blue-300 bg-blue-50' },
  { key: 'approved', label: 'Onaylandı', color: 'border-emerald-300 bg-emerald-50' },
  { key: 'rejected', label: 'Reddedildi', color: 'border-red-300 bg-red-50' },
  { key: 'expired', label: 'Süresi Dolmuş', color: 'border-gray-300 bg-gray-50' },
]

function getCurrencySymbol(currency: string) {
  switch (currency) {
    case 'TRY': case 'TL': return '₺'
    case 'USD': return '$'
    case 'EUR': return '€'
    default: return currency
  }
}

export default function PipelinePage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuotations()
  }, [])

  const loadQuotations = async () => {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from('quotations')
      .select('id, quotation_number, final_amount, currency, status, valid_until, created_at, companies(name)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (data) setQuotations(data as Quotation[])
    setLoading(false)
  }

  const handleStatusChange = async (quotationId: string, newStatus: string) => {
    const supabase = createSupabaseBrowserClient()
    const updateData: any = { status: newStatus }
    if (newStatus === 'sent') updateData.sent_at = new Date().toISOString()

    await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', quotationId)

    loadQuotations()
  }

  const groupedByStatus: Record<string, Quotation[]> = {}
  COLUMNS.forEach(col => { groupedByStatus[col.key] = [] })
  quotations.forEach(q => {
    const status = q.status === 'accepted' ? 'approved' : q.status
    if (groupedByStatus[status]) {
      groupedByStatus[status].push(q)
    } else {
      groupedByStatus['draft'].push(q)
    }
  })

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Pipeline</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const items = groupedByStatus[col.key]
          const total = items.reduce((sum, q) => sum + (q.final_amount || 0), 0)

          return (
            <div key={col.key} className={`flex-shrink-0 w-72 border-t-4 rounded-lg ${col.color}`}>
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">{col.label}</h3>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-600 font-medium">
                    {items.length}
                  </span>
                </div>
                {total > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </p>
                )}
              </div>

              <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Teklif yok</p>
                ) : (
                  items.map(q => {
                    const isExpiring = q.valid_until && new Date(q.valid_until) <= new Date(Date.now() + 3 * 86400000) && q.status !== 'expired'

                    return (
                      <div
                        key={q.id}
                        className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-mono text-xs font-semibold text-gray-800">
                            {q.quotation_number || q.id.slice(0, 8)}
                          </span>
                          {isExpiring && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                              Süresi yakın
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 truncate">
                          {q.companies?.name || '—'}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {(q.final_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(q.currency || 'TRY')}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {new Date(q.created_at).toLocaleDateString('tr-TR')}
                          </span>
                          {/* Quick status change */}
                          <select
                            value={q.status}
                            onChange={(e) => handleStatusChange(q.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5"
                          >
                            {COLUMNS.map(c => (
                              <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
