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
    currency: 'TRY',
    unit: 'adet',
    description: ''
  })

  // Bulk edit state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({
    currency: '',
    unit: '',
    price_multiplier: '1.0'
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
      // Exact match önceliği - tam ürün kodu araması
      const exactMatch = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('product_code', search)
        .limit(1)

      if (exactMatch.data && exactMatch.data.length > 0) {
        setProducts(exactMatch.data as any)
        setTotalCount(exactMatch.count || 0)
        console.log(`Exact match bulundu: ${(exactMatch.data[0] as any).product_code}`)
        return
      }

      // Partial search
      query = query.or(`product_code.ilike.%${search}%,product_type.ilike.%${search}%,diameter.ilike.%${search}%`)
    }

    const { data, count } = await query

    if (data) {
      setProducts(data)
      setTotalCount(count || 0)
      console.log(`Toplam ${count} ürün var, ${data.length} tanesi gösteriliyor`)
    }
  }

  // Debounced search - 300ms gecikme ile arama yap
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts()
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const getErrorMessage = (error: any): string => {
    // PostgreSQL error kodlarına göre kullanıcı dostu mesajlar
    switch (error.code) {
      case '23505': // Unique violation
        return 'Bu ürün kodu zaten mevcut! Lütfen farklı bir kod kullanın.'
      case '23503': // Foreign key violation
        return 'Bu ürün kullanan teklifler var! Önce teklifleri silmeniz gerekiyor.'
      case '23502': // NOT NULL violation
        return 'Zorunlu alanları doldurun (Ürün Tipi ve Ürün Kodu gereklidir).'
      case '22P02': // Invalid text representation
        return 'Geçersiz veri formatı! Lütfen alanları kontrol edin.'
      default:
        return `Hata: ${error.message || 'Bilinmeyen bir hata oluştu'}`
    }
  }

  const handleSave = async () => {
    // Frontend validation
    if (!formData.product_type || !formData.product_type.trim()) {
      alert('Ürün tipi zorunludur!')
      return
    }

    if (!formData.product_code || !formData.product_code.trim()) {
      alert('Ürün kodu zorunludur!')
      return
    }

    // Fiyat validation
    const price = formData.base_price ? parseFloat(formData.base_price) : 0
    if (isNaN(price) || price < 0) {
      alert('Geçersiz fiyat! Lütfen geçerli bir sayı girin.')
      return
    }

    const productData = {
      product_type: formData.product_type.trim(),
      diameter: formData.diameter.trim() || null,
      product_code: formData.product_code.trim(),
      base_price: price,
      currency: formData.currency,
      unit: formData.unit.trim() || 'adet',
      description: formData.description.trim() || null
    }

    if (editingId) {
      // Update existing product
      const { error } = await (supabase
        .from('products') as any)
        .update({ ...productData })
        .eq('id', editingId)

      if (error) {
        alert(getErrorMessage(error))
        return
      }
    } else {
      // Insert new product
      const { error } = await (supabase
        .from('products') as any)
        .insert([productData])

      if (error) {
        alert(getErrorMessage(error))
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
      alert(getErrorMessage(error))
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
      currency: 'TRY',  // Fixed: Changed from 'TL' to 'TRY' for consistency
      unit: 'adet',
      description: ''
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  // Bulk edit functions
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts)
    if (newSelection.has(productId)) {
      newSelection.delete(productId)
    } else {
      newSelection.add(productId)
    }
    setSelectedProducts(newSelection)
  }

  const selectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  const handleBulkUpdate = async () => {
    if (selectedProducts.size === 0) {
      alert('Lütfen en az bir ürün seçin')
      return
    }

    const multiplier = parseFloat(bulkEditData.price_multiplier)
    if (isNaN(multiplier) || multiplier <= 0) {
      alert('Geçersiz fiyat çarpanı! Lütfen pozitif bir sayı girin.')
      return
    }

    if (!confirm(`${selectedProducts.size} ürün güncellenecek. Emin misiniz?`)) {
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const productId of selectedProducts) {
      const product = products.find(p => p.id === productId)
      if (!product) continue

      const updates: any = {}

      // Para birimi değiştir
      if (bulkEditData.currency) {
        updates.currency = bulkEditData.currency
      }

      // Birim değiştir
      if (bulkEditData.unit) {
        updates.unit = bulkEditData.unit
      }

      // Fiyat çarpanı uygula (1.0'dan farklıysa)
      if (multiplier !== 1.0) {
        updates.base_price = product.base_price * multiplier
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await (supabase
          .from('products') as any)
          .update({ ...updates })
          .eq('id', productId)

        if (error) {
          console.error(`Hata (${product.product_code}):`, error)
          errorCount++
        } else {
          successCount++
        }
      }
    }

    alert(`Toplu güncelleme tamamlandı!\n\nBaşarılı: ${successCount}\nBaşarısız: ${errorCount}`)
    setSelectedProducts(new Set())
    setShowBulkEdit(false)
    setBulkEditData({ currency: '', unit: '', price_multiplier: '1.0' })
    loadProducts()
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      alert('Lütfen en az bir ürün seçin')
      return
    }

    if (!confirm(`${selectedProducts.size} ürün SİLİNECEK!\n\nUYARI: Bu ürünleri kullanan teklifler varsa silme işlemi başarısız olacaktır.\n\nEmin misiniz?`)) {
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const productId of selectedProducts) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) {
        errorCount++
      } else {
        successCount++
      }
    }

    alert(`Toplu silme tamamlandı!\n\nBaşarılı: ${successCount}\nBaşarısız: ${errorCount}`)
    setSelectedProducts(new Set())
    loadProducts()
  }

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'TRY':
      case 'TL':
        return '₺'
      case 'USD':
        return '$'
      case 'EUR':
        return '€'
      default:
        return currency
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
                  <option value="TRY">TL (₺)</option>
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

      {/* Bulk Edit Toolbar */}
      {selectedProducts.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-blue-900">
                {selectedProducts.size} ürün seçildi
              </span>
              <button
                onClick={() => setShowBulkEdit(!showBulkEdit)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                {showBulkEdit ? '✕ İptal' : '✏️ Toplu Düzenle'}
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                🗑️ Toplu Sil
              </button>
            </div>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="text-sm text-blue-700 hover:underline"
            >
              Seçimi Temizle
            </button>
          </div>

          {showBulkEdit && (
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-3">Toplu Güncelleme</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Para Birimi Değiştir <span className="text-gray-400">(boş bırakılırsa değişmez)</span>
                  </label>
                  <select
                    value={bulkEditData.currency}
                    onChange={(e) => setBulkEditData({...bulkEditData, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Değiştirme --</option>
                    <option value="TRY">TL (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Birim Değiştir <span className="text-gray-400">(boş bırakılırsa değişmez)</span>
                  </label>
                  <input
                    type="text"
                    value={bulkEditData.unit}
                    onChange={(e) => setBulkEditData({...bulkEditData, unit: e.target.value})}
                    placeholder="Örn: adet, metre, kg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fiyat Çarpanı <span className="text-gray-400">(1.1 = %10 artış, 0.9 = %10 indirim)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={bulkEditData.price_multiplier}
                    onChange={(e) => setBulkEditData({...bulkEditData, price_multiplier: e.target.value})}
                    placeholder="1.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={handleBulkUpdate}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Güncelle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-center p-3 w-12">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === products.length && products.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                  title={selectedProducts.size === products.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                />
              </th>
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
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                </td>
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
                    <span className="font-medium">{(isNaN(product.base_price) || product.base_price == null ? 0 : product.base_price).toFixed(2)}{getCurrencySymbol(product.currency)}</span>
                    {(product.base_price === 0 || isNaN(product.base_price) || product.base_price == null) && (
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
