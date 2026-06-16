'use client'

import { useState } from 'react'
import DiffViewer from './DiffViewer'
import { actionLabel, actionColor, entityLabel } from '@/lib/audit-labels'

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
  // Map of user_id -> email (from useUserEmails) so we can show who made the change.
  userEmails?: Record<string, string>
}

export default function AuditLogTable({ logs, loading, userEmails = {} }: AuditLogTableProps) {
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
        const isExpanded = expandedId === log.id

        // Get entity name from data
        const entityName = log.new_data?.product_code
          || log.new_data?.name
          || log.new_data?.quotation_number
          || log.old_data?.product_code
          || log.old_data?.name
          || log.old_data?.quotation_number
          || log.entity_id.slice(0, 8)

        const actor = log.user_id ? (userEmails[log.user_id] || 'Bilinmeyen kullanıcı') : 'Sistem'

        return (
          <div key={log.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              className="w-full px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-gray-50 text-left"
            >
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor(log.action)}`}>
                {actionLabel(log.action)}
              </span>
              <span className="text-sm text-gray-600">{entityLabel(log.entity_type)}</span>
              <span className="text-sm font-medium text-gray-800 truncate">{entityName}</span>
              <span className="text-xs text-gray-500 truncate">· {actor}</span>
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
