'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Product = {
  id: string
  product_type: string
  diameter: string | null
  product_code: string
  base_price: number
  currency: string
  unit: string
  description: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    product_type: '',
    diameter: '',
    product_code: '',
    base_price: '',
    currency: 'TL',
    unit: 'adet',
    description: ''
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('product_code')
      .limit(10000)  // 10,000'e kadar ürün göster

    if (search) {
      query = query.or(`product_code.ilike.%${search}%,product_type.ilike.%${search}%,diameter.ilike.%${search}%`)
    }

    const { data, count } = await query

    if (data) {
      setProducts(data)
      setTotalCount(count || 0)
      console.log(`Toplam ${count} ürün var, ${data.length} tanesi gösteriliyor`)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [search])

  const handleSave = async () => {
    if (!formData.product_type || !formData.product_code) {
      alert('Lütfen zorunlu alanları doldurun (Tip ve Kod)')
      return
    }

    const productData = {
      product_type: formData.product_type.trim(),
      diameter: formData.diameter.trim() || null,
      product_code: formData.product_code.trim(),
      base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
      currency: formData.currency,
      unit: formData.unit.trim() || 'adet',
      description: formData.description.trim() || null
    }

    if (editingId) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update({ ...productData, updated_at: new Date().toISOString() })
        .eq('id', editingId)

      if (error) {
        alert('Hata: ' + error.message)
        return
      }
    } else {
      // Insert new product
      const { error } = await supabase
        .from('products')
        .insert([productData])

      if (error) {
        if (error.code === '23505') {
          alert('Bu ürün kodu zaten mevcut!')
        } else {
          alert('Hata: ' + error.message)
        }
        return
      }
    }

    // Reset form and reload
    resetForm()
    loadProducts()
  }

  const handleEdit = (product: Product) => {
    setFormData({
      product_type: product.product_type,
      diameter: product.diameter || '',
      product_code: product.product_code,
      base_price: product.base_price.toString(),
      currency: product.currency,
      unit: product.unit,
      description: product.description || ''
    })
    setEditingId(product.id)
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Hata: ' + error.message)
      return
    }

    loadProducts()
  }

  const resetForm = () => {
    setFormData({
      product_type: '',
      diameter: '',
      product_code: '',
      base_price: '',
      currency: 'TL',
      unit: 'adet',
      description: ''
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'TL': return '₺'
      case 'USD': return '$'
      case 'EUR': return '€'
      default: return currency
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ürünler</h1>
          {totalCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Toplam <span className="font-semibold">{totalCount.toLocaleString('tr-TR')}</span> ürün
              {totalCount > 10000 && (
                <span className="ml-2 text-orange-600">
                  (İlk 10,000 tanesi gösteriliyor)
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showAddForm ? '✕ İptal' : '+ Yeni Ürün'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h3 className="font-semibold text-lg mb-4">
            {editingId ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Tipi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_type}
                onChange={(e) => setFormData({...formData, product_type: e.target.value})}
                placeholder="Örn: Boru, Vana, Conta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Çap / Ölçü <span className="text-gray-400">(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={formData.diameter}
                onChange={(e) => setFormData({...formData, diameter: e.target.value})}
                placeholder='Örn: 1/2", 3/4" (boş bırakılabilir)'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Kodu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) => setFormData({...formData, product_code: e.target.value})}
                placeholder="Örn: BR-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birim Fiyat <span className="text-gray-400">(opsiyonel, 0 ise "Fiyat sorunuz" gösterilir)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                  placeholder="125.50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Para Birimi
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="TL">TL (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birim <span className="text-gray-400">(opsiyonel, varsayılan: adet)</span>
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="Örn: adet, metre, kg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama <span className="text-gray-400">(opsiyonel)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Ürün hakkında ek bilgiler..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {editingId ? 'Güncelle' : 'Kaydet'}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün kodu, tipi veya çapı ile ara..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={() => setSearch('Tanımsız Ürün')}
            className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm whitespace-nowrap"
          >
            🔍 Tip Tanımsız Olanlar
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3">Kod</th>
              <th className="text-left p-3">Tip</th>
              <th className="text-left p-3">Çap</th>
              <th className="text-right p-3">Fiyat</th>
              <th className="text-left p-3">Birim</th>
              <th className="text-left p-3">Açıklama</th>
              <th className="text-center p-3">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{product.product_code}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span>{product.product_type}</span>
                    {product.product_type === 'Tanımsız Ürün' && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded whitespace-nowrap">
                        ⚠️ Tip tanımsız
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{product.diameter || '-'}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-medium">{product.base_price.toFixed(2)} {getCurrencySymbol(product.currency)}</span>
                    {product.base_price === 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded whitespace-nowrap">
                        ⚠️ Fiyat sorunuz
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{product.unit}</td>
                <td className="p-3 text-gray-600 text-xs">{product.description || '-'}</td>
                <td className="p-3">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
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
        {products.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {search ? 'Ürün bulunamadı' : 'Henüz ürün eklenmemiş. Yukarıdaki "+ Yeni Ürün" butonundan manuel ekleyebilir veya Excel Import menüsünden toplu ürün ekleyebilirsiniz.'}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Toplam {products.length} ürün
      </div>
    </div>
  )
}
