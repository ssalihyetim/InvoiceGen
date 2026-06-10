'use client'

import { useState } from 'react'
import DiffViewer from './DiffViewer'

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

interface AuditLogTableProps {
  logs: AuditLog[]
  loading: boolean
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: 'Oluşturma', color: 'bg-green-100 text-green-800' },
  update: { label: 'Güncelleme', color: 'bg-blue-100 text-blue-800' },
  delete: { label: 'Silme', color: 'bg-red-100 text-red-800' },
  status_change: { label: 'Durum Değişikliği', color: 'bg-purple-100 text-purple-800' },
}

const ENTITY_LABELS: Record<string, string> = {
  products: 'Ürün',
  companies: 'Firma',
  quotations: 'Teklif',
  quotation_items: 'Teklif Kalemi',
}

export default function AuditLogTable({ logs, loading }: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
  }

  if (logs.length === 0) {
    return <div className="p-8 text-center text-gray-500">Kayıt bulunamadı</div>
  }

  return (
    <div className="space-y-2">
      {logs.map(log => {
        const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-800' }
        const entityLabel = ENTITY_LABELS[log.entity_type] || log.entity_type
        const isExpanded = expandedId === log.id

        // Get entity name from data
        const entityName = log.new_data?.product_code
          || log.new_data?.name
          || log.new_data?.quotation_number
          || log.old_data?.product_code
          || log.old_data?.name
          || log.old_data?.quotation_number
          || log.entity_id.slice(0, 8)

        return (
          <div key={log.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
            >
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionInfo.color}`}>
                {actionInfo.label}
              </span>
              <span className="text-sm text-gray-600">{entityLabel}</span>
              <span className="text-sm font-medium text-gray-800 truncate">{entityName}</span>
              <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                {new Date(log.created_at).toLocaleString('tr-TR')}
              </span>
              <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <DiffViewer oldData={log.old_data} newData={log.new_data} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
