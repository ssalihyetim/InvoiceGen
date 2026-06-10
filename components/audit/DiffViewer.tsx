'use client'

interface DiffViewerProps {
  oldData: Record<string, any> | null
  newData: Record<string, any> | null
}

/**
 * Shows a side-by-side diff of old vs new data for audit log entries.
 */
export default function DiffViewer({ oldData, newData }: DiffViewerProps) {
  if (!oldData && !newData) return null

  // Get all unique keys
  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ])

  // Filter to only changed fields
  const changedKeys = [...allKeys].filter(key => {
    // Skip internal fields
    if (['updated_at', 'created_at', 'search_text', 'search_vector'].includes(key)) return false
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
          <div key={key} className="flex gap-2">
            <span className="font-mono text-gray-500 w-32 flex-shrink-0 truncate">{key}:</span>
            {oldVal !== undefined && (
              <span className="bg-red-50 text-red-700 px-1 rounded line-through truncate max-w-[200px]">
                {typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)}
              </span>
            )}
            {newVal !== undefined && (
              <span className="bg-green-50 text-green-700 px-1 rounded truncate max-w-[200px]">
                {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
