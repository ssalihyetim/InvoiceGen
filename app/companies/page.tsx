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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase
      .from('companies')
      .insert({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        tax_number: formData.tax_number || null
      })

    if (!error) {
      alert('Firma eklendi')
      setFormData({ name: '', email: '', phone: '', tax_number: '' })
      setShowForm(false)
      loadCompanies()
    } else {
      alert('Hata: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Firmalar</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'İptal' : '+ Yeni Firma'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">Yeni Firma Ekle</h2>
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
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Kaydet
            </button>
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
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{company.name}</td>
                <td className="p-4">{company.email || '-'}</td>
                <td className="p-4">{company.phone || '-'}</td>
                <td className="p-4">{company.tax_number || '-'}</td>
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
