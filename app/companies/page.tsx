'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Company = {
  id: string
  name: string
  email: string | null
  phone: string | null
  tax_number: string | null
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tax_number: ''
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('name')

    if (data) setCompanies(data)
  }

  const getErrorMessage = (error: any): string => {
    switch (error.code) {
      case '23505':
        return 'Bu firma adı zaten mevcut! Lütfen farklı bir isim kullanın.'
      case '23503':
        return 'Bu firma kullanan teklifler var! Önce teklifleri silmeniz gerekiyor.'
      case '23502':
        return 'Firma adı zorunludur!'
      default:
        return `Hata: ${error.message || 'Bilinmeyen bir hata oluştu'}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const companyData = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      tax_number: formData.tax_number || null
    }

    if (editingId) {
      // Update existing company
      const { error } = await (supabase
        .from('companies') as any)
        .update(companyData)
        .eq('id', editingId)

      if (!error) {
        alert('Firma güncellendi')
        resetForm()
        loadCompanies()
      } else {
        alert(getErrorMessage(error))
      }
    } else {
      // Insert new company
      const { error } = await (supabase
        .from('companies') as any)
        .insert([companyData])

      if (!error) {
        alert('Firma eklendi')
        resetForm()
        loadCompanies()
      } else {
        alert(getErrorMessage(error))
      }
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
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" firmasını silmek istediğinizden emin misiniz?\n\nUYARI: Bu firmaya ait teklifler varsa silme işlemi başarısız olacaktır.`)) {
      return
    }

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (!error) {
      alert('Firma silindi')
      loadCompanies()
    } else {
      alert(getErrorMessage(error))
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', tax_number: '' })
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Firmalar</h1>
        <button
          onClick={() => {
            if (showForm && editingId) {
              resetForm()
            } else {
              setShowForm(!showForm)
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? '✕ İptal' : '+ Yeni Firma'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Firmayı Düzenle' : 'Yeni Firma Ekle'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Firma Adı *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vergi No</label>
              <input
                type="text"
                value={formData.tax_number}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {editingId ? 'Güncelle' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Firma Adı</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Telefon</th>
              <th className="text-left p-4">Vergi No</th>
              <th className="text-center p-4">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{company.name}</td>
                <td className="p-4">{company.email || '-'}</td>
                <td className="p-4">{company.phone || '-'}</td>
                <td className="p-4">{company.tax_number || '-'}</td>
                <td className="p-4">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(company)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(company.id, company.name)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Henüz firma eklenmemiş
          </div>
        )}
      </div>
    </div>
  )
}
