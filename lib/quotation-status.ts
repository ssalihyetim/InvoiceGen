// Single source of truth for quotation status values.
//
// History: the original DB constraint used 'accepted', but the UI and the
// notification trigger settled on 'approved'. Migration 20260609 migrates
// legacy 'accepted' rows to 'approved' and updates the CHECK constraint.
// normalizeStatus() keeps the UI correct for any row read BEFORE that
// migration runs (or from an un-migrated environment).

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'

export const QUOTATION_STATUSES: QuotationStatus[] = [
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired',
]

// Statuses a user can manually set (expired is system-assigned only).
export const SELECTABLE_STATUSES: QuotationStatus[] = [
  'draft',
  'sent',
  'approved',
  'rejected',
]

export const STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  expired: 'Süresi Dolmuş',
}

// Map any legacy/raw status value to its canonical form.
export function normalizeStatus(status: string): QuotationStatus {
  if (status === 'accepted') return 'approved'
  if ((QUOTATION_STATUSES as string[]).includes(status)) {
    return status as QuotationStatus
  }
  return 'draft'
}
