'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useUserEmails } from '@/lib/use-user-emails'
import { actionLabel, actionColor } from '@/lib/audit-labels'
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

type Version = {
  id: string
  version_number: number
  created_at: string | null
  changed_by: string | null
  change_reason: string | null
}

type Props = {
  isOpen: boolean
  entityType: 'products' | 'companies' | 'quotations' | 'quotation_items'
  entityId: string
  title?: string
  onClose: () => void
}

// Per-record change history (F4 record-level + F5 quotation versions). Reads audit_logs
// for one record; for quotations it also lists quotation_versions snapshots.
export default function RecordHistoryModal({ isOpen, entityType, entityId, title, onClose }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const userEmails = useUserEmails()

  useEffect(() => {
    if (!isOpen || !entityId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const supabase = createSupabaseBrowserClient()

      const { data: logData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(100)

      let versionData: Version[] = []
      if (entityType === 'quotations') {
        const { data: v } = await supabase
          .from('quotation_versions')
          .select('id, version_number, created_at, changed_by, change_reason')
          .eq('quotation_id', entityId)
          .order('version_number', { ascending: false })
        versionData = (v as Version[]) || []
      }

      if (!cancelled) {
        setLogs((logData as AuditLog[]) || [])
        setVersions(versionData)
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isOpen, entityType, entityId])

  if (!isOpen) return null

  const actorOf = (id: string | null) => (id ? userEmails[id] || 'Bilinmeyen kullanıcı' : 'Sistem')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">🕘 Değişiklik Geçmişi</h3>
            {title && <p className="text-sm text-gray-500 mt-1">{title}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl px-2">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {entityType === 'quotations' && versions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Sürümler ({versions.length})</h4>
              <ul className="space-y-1 text-sm">
                {versions.map(v => (
                  <li key={v.id} className="flex items-center gap-2 text-gray-600">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                      v{v.version_number}
                    </span>
                    <span className="text-xs">{actorOf(v.changed_by)}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {v.created_at ? new Date(v.created_at).toLocaleString('tr-TR') : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Aktivite</h4>
            {loading ? (
              <div className="p-6 text-center text-gray-500">Yükleniyor...</div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Bu kayıt için geçmiş bulunamadı.</div>
            ) : (
              <div className="space-y-2">
                {logs.map(log => {
                  const isExpanded = expandedId === log.id
                  return (
                    <div key={log.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="w-full px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 hover:bg-gray-50 text-left"
                      >
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor(log.action)}`}>
                          {actionLabel(log.action)}
                        </span>
                        <span className="text-xs text-gray-500 truncate">{actorOf(log.user_id)}</span>
                        <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                          {new Date(log.created_at).toLocaleString('tr-TR')}
                        </span>
                        <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                          <DiffViewer oldData={log.old_data} newData={log.new_data} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
