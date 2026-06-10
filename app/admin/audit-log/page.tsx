'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { isAdminLevel } from '@/lib/permissions'
import AuditLogTable from '@/components/audit/AuditLogTable'

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

export default function AuditLogPage() {
  const { role } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [entityFilter, setEntityFilter] = useState<string>('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  useEffect(() => {
    loadLogs()
  }, [entityFilter, actionFilter, dateFrom, dateTo])

  const loadLogs = async () => {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (entityFilter) query = query.eq('entity_type', entityFilter)
    if (actionFilter) query = query.eq('action', actionFilter)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

    const { data, error } = await query

    if (data) setLogs(data as AuditLog[])
    if (error) console.error('Audit log fetch error:', error)
    setLoading(false)
  }

  if (!isAdminLevel(role)) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Erişim Reddedildi</h1>
        <p className="text-gray-600">Bu sayfaya yalnızca yöneticiler erişebilir.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Denetim Kaydı</h1>

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

      {/* Audit Log Table */}
      <AuditLogTable logs={logs} loading={loading} />
    </div>
  )
}
