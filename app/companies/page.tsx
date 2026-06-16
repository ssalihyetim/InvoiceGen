'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'

type Company = {
  id: string
  name: string
  email: string | null
  phone: string | null
  tax_number: string | null
}

type Toast = { type: 'success' | 'error'; message: string }

export default function CompaniesPage() {
  const supabase = createSupabaseBrowserClient()
  const { tenantId } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tax_number: ''
  })

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name')

    if (error) {
      showToast('error', 'Firmalar yüklenirken hata oluştu: ' + error.message)
    } else if (data) {
      setCompanies(data)
    }
    setLoading(false)
  }

  const getErrorMessage = (error: any): string => {
    switch (error.code) {
      case '23505': return 'Bu firma adı zaten mevcut!'
      case '23503': return 'Bu firmaya ait teklifler var, önce teklifleri silin.'
      case '23502': return 'Firma adı zorunludur!'
      default: return error.message || 'Bilinmeyen bir hata oluştu'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) { showToast('error', 'Firma adı zorunludur!'); return }

    setSaving(true)
    const companyData = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      tax_number: formData.tax_number.trim() || null,
      ...(editingId ? {} : { tenant_id: tenantId }),
    }

    const op = editingId
      ? (supabase.from('companies') as any).update(companyData).eq('id', editingId)
      : (supabase.from('companies') as any).insert([companyData])

    const { error } = await op
    setSaving(false)

    if (error) {
      showToast('error', getErrorMessage(error))
    } else {
      showToast('success', editingId ? 'Firma güncellendi.' : 'Firma eklendi.')
      resetForm()
      loadCompanies()
    }
  }

  const handleEdit = (company: Company) => {
    setFormData({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      tax_number: company.tax_number || ''
    })
    setEditingId(company.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" firmasını silmek istediğinizden emin misiniz?`)) return

    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) {
      showToast('error', getErrorMessage(error))
    } else {
      showToast('success', `"${name}" silindi.`)
      loadCompanies()
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', tax_number: '' })
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏢 Firmalar</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Yükleniyor...' : `${companies.length} firma kayıtlı`}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm() }}
          className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${showForm ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {showForm ? '✕ İptal' : '+ Yeni Firma'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-5 text-gray-800">
            {editingId ? '✏️ Firmayı Düzenle' : '+ Yeni Firma Ekle'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Örn: ABC Ticaret Ltd. Şti."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="info@firma.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0212 555 55 55"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vergi No</label>
              <input
                type="text"
                value={formData.tax_number}
                onChange={e => setFormData({ ...formData, tax_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="1234567890"
              />
            </div>
            <div className="md:col-span-2 flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium text-sm"
              >
                {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kaydet'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-3xl mb-2 animate-bounce">⏳</div>
            <p>Yükleniyor...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">🏢</div>
            <p className="font-medium text-gray-600 mb-1">Henüz firma eklenmemiş</p>
            <p className="text-sm mb-4">İlk firmayı eklemek için yukarıdaki butona tıklayın.</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              + Yeni Firma Ekle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Firma Adı</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vergi No</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companies.map(company => (
                  <tr key={company.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{company.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{company.email || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-gray-600">{company.phone || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">{company.tax_number || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5 justify-center">
                        <button onClick={() => handleEdit(company)} className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                          Düzenle
                        </button>
                        <button onClick={() => handleDelete(company.id, company.name)} className="px-3 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                          Sil
                        </button>
                      </div>
                    </td>
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
