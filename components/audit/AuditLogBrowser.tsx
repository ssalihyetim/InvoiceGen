'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import AuditLogTable from './AuditLogTable'
import { useUserEmails } from '@/lib/use-user-emails'

type AuditLog = {
  id: string
  entity_type: string
  entity_id: string
  action: string
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  user_id: string | null
  created_at: string
}

const PAGE_SIZE = 50

// Full chronological change log with filters + pagination, readable by every role
// (RLS scopes rows to the tenant). Shared so the admin page stays thin.
export default function AuditLogBrowser() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const userEmails = useUserEmails()

  const loadLogs = async (targetPage = 0) => {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const from = targetPage * PAGE_SIZE

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (entityFilter) query = query.eq('entity_type', entityFilter)
    if (actionFilter) query = query.eq('action', actionFilter)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

    const { data, count, error } = await query
    if (data) setLogs(data as AuditLog[])
    if (count !== null && count !== undefined) setTotalCount(count)
    if (error) console.error('Audit log fetch error:', error)
    setLoading(false)
  }

  // Reload from page 0 whenever a filter changes (also runs on mount).
  useEffect(() => {
    setPage(0)
    loadLogs(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter, actionFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const goToPage = (n: number) => {
    const clamped = Math.min(Math.max(0, n), totalPages - 1)
    if (clamped === page) return
    setPage(clamped)
    loadLogs(clamped)
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Varlık Tipi</label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Tümü</option>
              <option value="products">Ürünler</option>
              <option value="companies">Firmalar</option>
              <option value="quotations">Teklifler</option>
              <option value="quotation_items">Teklif Kalemleri</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">İşlem</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Tümü</option>
              <option value="create">Oluşturma</option>
              <option value="update">Güncelleme</option>
              <option value="delete">Silme</option>
              <option value="status_change">Durum Değişikliği</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <AuditLogTable logs={logs} loading={loading} userEmails={userEmails} />

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Toplam {totalCount} kayıt · Sayfa {page + 1} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Önceki
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
