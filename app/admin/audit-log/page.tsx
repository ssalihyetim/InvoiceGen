'use client'

import AuditLogBrowser from '@/components/audit/AuditLogBrowser'

// Change log is readable by every role (RLS scopes rows to the tenant). The full
// chronological browser lives in AuditLogBrowser; per-record history is surfaced via the
// "Geçmiş" buttons on products / quotations (RecordHistoryModal).
export default function AuditLogPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Değişiklik Geçmişi</h1>
      <p className="text-gray-600 mb-6">Kim, ne zaman, neyi değiştirdi — tüm değişikliklerin kaydı.</p>
      <AuditLogBrowser />
    </div>
  )
}
