'use client'

import { fieldLabel, HIDDEN_DIFF_FIELDS } from '@/lib/audit-labels'

interface DiffViewerProps {
  oldData: Record<string, any> | null
  newData: Record<string, any> | null
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/**
 * Shows a human-readable diff of old vs new data for audit log entries, using Turkish
 * field labels and hiding internal/noise columns.
 */
export default function DiffViewer({ oldData, newData }: DiffViewerProps) {
  if (!oldData && !newData) return null

  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])

  const changedKeys = [...allKeys].filter(key => {
    if (HIDDEN_DIFF_FIELDS.has(key)) return false
    const oldVal = oldData?.[key]
    const newVal = newData?.[key]
    return JSON.stringify(oldVal) !== JSON.stringify(newVal)
  })

  if (changedKeys.length === 0) {
    return <p className="text-sm text-gray-500 italic">Değişiklik yok</p>
  }

  return (
    <div className="text-xs space-y-1">
      {changedKeys.map(key => {
        const oldVal = oldData?.[key]
        const newVal = newData?.[key]
        return (
          <div key={key} className="flex gap-2 items-start">
            <span className="text-gray-600 w-32 flex-shrink-0">{fieldLabel(key)}:</span>
            {oldData && oldVal !== undefined && (
              <span className="bg-red-50 text-red-700 px-1 rounded line-through break-all max-w-[220px]">
                {formatValue(oldVal)}
              </span>
            )}
            {oldData && newData && <span className="text-gray-400">→</span>}
            {newVal !== undefined && (
              <span className="bg-green-50 text-green-700 px-1 rounded break-all max-w-[220px]">
                {formatValue(newVal)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
