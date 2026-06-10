'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { canPerform } from '@/lib/permissions'

type Company = { id: string; name: string }
type DiscountRule = {
  id: string
  company_id: string
  product_type: string | null
  discount_percentage: number
  min_quantity: number | null
  valid_from: string
  valid_until: string | null
  company_name?: string
}

export default function DiscountsPage() {
  const { role, tenantId } = useAuth()
  const [rules, setRules] = useState<DiscountRule[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formCompanyId, setFormCompanyId] = useState('')
  const [formProductType, setFormProductType] = useState('')
  const [formPercentage, setFormPercentage] = useState(0)
  const [formMinQty, setFormMinQty] = useState<number | ''>('')
  const [formValidFrom, setFormValidFrom] = useState(new Date().toISOString().split('T')[0])
  const [formValidUntil, setFormValidUntil] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createSupabaseBrowserClient()

    const [rulesRes, companiesRes] = await Promise.all([
      supabase.from('discount_rules').select('*, companies(name)').order('created_at', { ascending: false }),
      supabase.from('companies').select('id, name').order('name'),
    ])

    if (rulesRes.data) {
      setRules(rulesRes.data.map((r: any) => ({
        ...r,
        company_name: r.companies?.name || '—',
      })))
    }
    if (companiesRes.data) setCompanies(companiesRes.data)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!formCompanyId || formPercentage <= 0 || !tenantId) return
    setSaving(true)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from('discount_rules').insert({
      tenant_id: tenantId,
      company_id: formCompanyId,
      product_type: formProductType || null,
      discount_percentage: formPercentage,
      min_quantity: formMinQty || null,
      valid_from: formValidFrom,
      valid_until: formValidUntil || null,
    })

    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setShowForm(false)
      resetForm()
      loadData()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu iskonto kuralını silmek istediğinizden emin misiniz?')) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from('discount_rules').delete().eq('id', id)
    loadData()
  }

  const resetForm = () => {
    setFormCompanyId('')
    setFormProductType('')
    setFormPercentage(0)
    setFormMinQty('')
    setFormValidFrom(new Date().toISOString().split('T')[0])
    setFormValidUntil('')
  }

  const canEdit = canPerform(role, 'settings', 'create')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">İskonto Kuralları</h1>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {showForm ? 'İptal' : '+ Yeni Kural'}
          </button>
        )}
      </div>

      {/* New Rule Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">Yeni İskonto Kuralı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firma *</label>
              <select
                value={formCompanyId}
                onChange={(e) => setFormCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Seçin...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Tipi (boş = tümü)</label>
              <input
                type="text"
                value={formProductType}
                onChange={(e) => setFormProductType(e.target.value)}
                placeholder="Örn: MANŞON, DİRSEK"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İskonto % *</label>
              <input
                type="number"
                value={formPercentage}
                onChange={(e) => setFormPercentage(Number(e.target.value))}
                min="0" max="100" step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Miktar</label>
              <input
                type="number"
                value={formMinQty}
                onChange={(e) => setFormMinQty(e.target.value ? Number(e.target.value) : '')}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geçerlilik Başlangıç *</label>
              <input
                type="date"
                value={formValidFrom}
                onChange={(e) => setFormValidFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geçerlilik Bitiş</label>
              <input
                type="date"
                value={formValidUntil}
                onChange={(e) => setFormValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !formCompanyId || formPercentage <= 0}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Henüz iskonto kuralı yok. Yeni kural ekleyerek başlayın.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">Firma</th>
                  <th className="text-left p-4">Ürün Tipi</th>
                  <th className="text-center p-4">İskonto %</th>
                  <th className="text-center p-4">Min. Miktar</th>
                  <th className="text-left p-4">Geçerlilik</th>
                  {canEdit && <th className="text-center p-4">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} className="border-t border-gray-100">
                    <td className="p-4 font-medium">{rule.company_name}</td>
                    <td className="p-4">{rule.product_type || 'Tümü'}</td>
                    <td className="p-4 text-center font-semibold text-blue-600">%{rule.discount_percentage}</td>
                    <td className="p-4 text-center">{rule.min_quantity || '—'}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {rule.valid_from} {rule.valid_until ? `— ${rule.valid_until}` : '(süresiz)'}
                    </td>
                    {canEdit && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Sil
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
