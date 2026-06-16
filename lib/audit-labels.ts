// Turkish labels + formatting for the change log (audit_logs) UI, so non-technical users
// see "Liste Fiyatı: 100 → 120" instead of raw column names and UUIDs.

export const FIELD_LABELS: Record<string, string> = {
  base_price: 'Liste Fiyatı',
  product_type: 'Ürün Tipi',
  product_code: 'Ürün Kodu',
  diameter: 'Çap/Ölçü',
  currency: 'Para Birimi',
  unit: 'Birim',
  description: 'Açıklama',
  name: 'Ad',
  email: 'E-posta',
  phone: 'Telefon',
  tax_number: 'Vergi No',
  address: 'Adres',
  status: 'Durum',
  total_amount: 'Toplam',
  discount_amount: 'İskonto Tutarı',
  final_amount: 'Genel Toplam',
  subtotal: 'Ara Toplam',
  quotation_number: 'Teklif No',
  quantity: 'Miktar',
  unit_price: 'Birim Fiyat',
  list_price: 'Liste Fiyatı',
  discount_percentage: 'İskonto %',
  manual_name: 'Manuel Ürün Adı',
  manual_code: 'Manuel Ürün Kodu',
  manual_unit: 'Manuel Birim',
  valid_until: 'Geçerlilik',
  notes: 'Notlar',
  ai_matched: 'AI Eşleşme',
  original_request: 'Orijinal Talep',
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
}

// Columns that are noise in a human-facing diff.
export const HIDDEN_DIFF_FIELDS = new Set([
  'id',
  'tenant_id',
  'user_id',
  'company_id',
  'quotation_id',
  'product_id',
  'created_at',
  'updated_at',
  'search_text',
  'search_vector',
  'embedding',
])

export const ENTITY_LABELS: Record<string, string> = {
  products: 'Ürün',
  companies: 'Firma',
  quotations: 'Teklif',
  quotation_items: 'Teklif Kalemi',
}

export function entityLabel(t: string): string {
  return ENTITY_LABELS[t] || t
}

export const ACTION_LABELS: Record<string, string> = {
  create: 'Oluşturma',
  update: 'Güncelleme',
  delete: 'Silme',
  status_change: 'Durum Değişikliği',
}

export function actionLabel(a: string): string {
  return ACTION_LABELS[a] || a
}

export const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  status_change: 'bg-purple-100 text-purple-800',
}

export function actionColor(a: string): string {
  return ACTION_COLORS[a] || 'bg-gray-100 text-gray-800'
}
