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

type Toast = { type: 'success' | 'error'; message: string }

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

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [showBulkEditAll, setShowBulkEditAll] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({ currency: '', unit: '', price_multiplier: '1.0' })
  const [loading, setLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    if (search) {
      const exactMatch = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('product_code', search)
        .limit(1)

      if (exactMatch.data && exactMatch.data.length > 0) {
        setProducts(exactMatch.data as any)
        setTotalCount(exactMatch.count || 0)
        setLoading(false)
        return
      }
    }

    const PAGE = 1000
    const allProducts: Product[] = []
    let from = 0

    while (true) {
      let q = supabase.from('products').select('*').order('product_code').range(from, from + PAGE - 1)
      if (search) q = q.or(`product_code.ilike.%${search}%,product_type.ilike.%${search}%,diameter.ilike.%${search}%`)
      const { data } = await q
      if (!data || data.length === 0) break
      allProducts.push(...(data as Product[]))
      if (data.length < PAGE) break
      from += PAGE
    }

    let countQuery = supabase.from('products').select('*', { count: 'exact', head: true })
    if (search) countQuery = countQuery.or(`product_code.ilike.%${search}%,product_type.ilike.%${search}%,diameter.ilike.%${search}%`)
    const { count } = await countQuery

    setProducts(allProducts)
    setTotalCount(count || allProducts.length)
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 300)
    return () => clearTimeout(timer)
  }, [search])

  const getErrorMessage = (error: any): string => {
    switch (error.code) {
      case '23505': return 'Bu ürün kodu zaten mevcut!'
      case '23503': return 'Bu ürünü kullanan teklifler var, önce teklifleri silin.'
      case '23502': return 'Zorunlu alanları doldurun (Ürün Tipi ve Ürün Kodu gereklidir).'
      default: return error.message || 'Bilinmeyen bir hata oluştu'
    }
  }

  const handleSave = async () => {
    if (!formData.product_type.trim()) { showToast('error', 'Ürün tipi zorunludur!'); return }
    if (!formData.product_code.trim()) { showToast('error', 'Ürün kodu zorunludur!'); return }

    const price = formData.base_price ? parseFloat(formData.base_price) : 0
    if (isNaN(price) || price < 0) { showToast('error', 'Geçersiz fiyat!'); return }

    const productData = {
      product_type: formData.product_type.trim(),
      diameter: formData.diameter.trim() || null,
      product_code: formData.product_code.trim(),
      base_price: price,
      currency: formData.currency,
      unit: formData.unit.trim() || 'adet',
      description: formData.description.trim() || null
    }

    const op = editingId
      ? (supabase.from('products') as any).update(productData).eq('id', editingId)
      : (supabase.from('products') as any).insert([productData])

    const { error } = await op
    if (error) { showToast('error', getErrorMessage(error)); return }

    showToast('success', editingId ? 'Ürün güncellendi.' : 'Ürün eklendi.')
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { showToast('error', getErrorMessage(error)); return }
    showToast('success', 'Ürün silindi.')
    loadProducts()
  }

  const resetForm = () => {
    setFormData({ product_type: '', diameter: '', product_code: '', base_price: '', currency: 'TRY', unit: 'adet', description: '' })
    setEditingId(null)
    setShowAddForm(false)
  }

  const toggleProductSelection = (productId: string) => {
    const s = new Set(selectedProducts)
    s.has(productId) ? s.delete(productId) : s.add(productId)
    setSelectedProducts(s)
  }

  const selectAll = () => {
    setSelectedProducts(selectedProducts.size === products.length ? new Set() : new Set(products.map(p => p.id)))
  }

  const handleBulkUpdate = async () => {
    if (selectedProducts.size === 0) { showToast('error', 'Lütfen en az bir ürün seçin'); return }
    const multiplier = parseFloat(bulkEditData.price_multiplier)
    if (isNaN(multiplier) || multiplier <= 0) { showToast('error', 'Geçersiz fiyat çarpanı!'); return }
    if (!confirm(`${selectedProducts.size} ürün güncellenecek. Emin misiniz?`)) return

    setBulkLoading(true)
    try {
      const res = await fetch('/api/bulk-update-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedProducts), updates: { currency: bulkEditData.currency || undefined, unit: bulkEditData.unit || undefined, price_multiplier: multiplier } })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Güncelleme başarısız')
      showToast('success', `${result.success} ürün güncellendi.`)
    } catch (err: any) {
      showToast('error', err.message)
    }
    setBulkLoading(false)
    setSelectedProducts(new Set())
    setShowBulkEdit(false)
    setBulkEditData({ currency: '', unit: '', price_multiplier: '1.0' })
    loadProducts()
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) { showToast('error', 'Lütfen en az bir ürün seçin'); return }
    if (!confirm(`${selectedProducts.size} ürün silinecek. Emin misiniz?`)) return

    setBulkLoading(true)
    try {
      const res = await fetch('/api/bulk-delete-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedProducts) })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Silme başarısız')
      showToast('success', `${result.deleted} ürün silindi.`)
    } catch (err: any) {
      showToast('error', err.message)
    }
    setBulkLoading(false)
    setSelectedProducts(new Set())
    loadProducts()
  }

  const handleBulkUpdateAll = async () => {
    const multiplier = parseFloat(bulkEditData.price_multiplier)
    if (isNaN(multiplier) || multiplier <= 0) { showToast('error', 'Geçersiz fiyat çarpanı!'); return }
    if (!confirm(`TÜM ${totalCount.toLocaleString('tr-TR')} ürün güncellenecek. Emin misiniz?`)) return

    setBulkLoading(true)
    try {
      const res = await fetch('/api/bulk-update-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applyToAll: true, updates: { currency: bulkEditData.currency || undefined, unit: bulkEditData.unit || undefined, price_multiplier: multiplier } })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Güncelleme başarısız')
      showToast('success', `${result.success} ürün güncellendi.`)
    } catch (err: any) {
      showToast('error', err.message)
    }
    setBulkLoading(false)
    setShowBulkEditAll(false)
    setBulkEditData({ currency: '', unit: '', price_multiplier: '1.0' })
    loadProducts()
  }

  const handleBulkDeleteAll = async () => {
    if (!confirm(`TÜM ${totalCount.toLocaleString('tr-TR')} ürün SİLİNECEK!\n\nBU İŞLEM GERİ ALINAMAZ!`)) return
    if (!confirm('Son onay: Tüm ürün veritabanı silinecek. Devam?')) return

    setBulkLoading(true)
    try {
      const res = await fetch('/api/bulk-delete-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applyToAll: true })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Silme başarısız')
      showToast('success', `${result.deleted} ürün silindi.`)
    } catch (err: any) {
      showToast('error', err.message)
    }
    setBulkLoading(false)
    loadProducts()
  }

  const getCurrencySymbol = (c: string) => c === 'TRY' || c === 'TL' ? '₺' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c

  return (
    <div className="relative">

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ürünler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Yükleniyor...' : (
              <>Toplam <span className="font-semibold text-gray-700">{totalCount.toLocaleString('tr-TR')}</span> ürün</>
            )}
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); if (showAddForm) resetForm() }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${showAddForm ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {showAddForm ? '✕ İptal' : '+ Yeni Ürün'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <h3 className="font-semibold text-lg mb-4 text-gray-800">
            {editingId ? '✏️ Ürünü Düzenle' : '+ Yeni Ürün Ekle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Tipi <span className="text-red-500">*</span></label>
              <input type="text" value={formData.product_type} onChange={e => setFormData({...formData, product_type: e.target.value})} placeholder="Örn: Boru, Vana, Conta" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Çap / Ölçü <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
              <input type="text" value={formData.diameter} onChange={e => setFormData({...formData, diameter: e.target.value})} placeholder='Örn: 1/2", 3/4"' className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Kodu <span className="text-red-500">*</span></label>
              <input type="text" value={formData.product_code} onChange={e => setFormData({...formData, product_code: e.target.value})} placeholder="Örn: BR-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birim Fiyat</label>
                <input type="number" step="0.01" value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
                <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="TRY">TL (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
              <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="adet, metre, kg..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ek bilgi..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
              {editingId ? 'Güncelle' : 'Kaydet'}
            </button>
            <button onClick={resetForm} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ürün kodu, tipi veya çapı ile ara..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => setSearch('Tanımsız Ürün')} className="px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm whitespace-nowrap">
            ⚠ Tipi Tanımsız
          </button>
          {search && (
            <button onClick={() => setSearch('')} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Bulk Apply All toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">
          Tüm <span className="text-blue-600">{totalCount.toLocaleString('tr-TR')}</span> ürüne uygula:
        </span>
        <button onClick={() => setShowBulkEditAll(!showBulkEditAll)} disabled={bulkLoading} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50">
          {showBulkEditAll ? 'İptal' : 'Toplu Güncelle (Tümü)'}
        </button>
        <button onClick={handleBulkDeleteAll} disabled={bulkLoading} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
          {bulkLoading ? 'İşleniyor...' : 'Tümünü Sil'}
        </button>
      </div>

      {showBulkEditAll && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-4">
          <h3 className="font-semibold mb-3 text-purple-900">Tüm {totalCount.toLocaleString('tr-TR')} Ürünü Güncelle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Para Birimi <span className="text-gray-400 font-normal">(boş = değişmez)</span></label>
              <select value={bulkEditData.currency} onChange={e => setBulkEditData({...bulkEditData, currency: e.target.value})} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">-- Değiştirme --</option>
                <option value="TRY">TL (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Birim <span className="text-gray-400 font-normal">(boş = değişmez)</span></label>
              <input type="text" value={bulkEditData.unit} onChange={e => setBulkEditData({...bulkEditData, unit: e.target.value})} placeholder="adet, metre, kg" className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fiyat Çarpanı <span className="text-gray-400 font-normal">(1.1 = %10 artış)</span></label>
              <input type="number" step="0.01" value={bulkEditData.price_multiplier} onChange={e => setBulkEditData({...bulkEditData, price_multiplier: e.target.value})} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
          </div>
          <button onClick={handleBulkUpdateAll} disabled={bulkLoading} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium">
            {bulkLoading ? 'Güncelleniyor...' : `Tüm ${totalCount.toLocaleString('tr-TR')} Ürünü Güncelle`}
          </button>
        </div>
      )}

      {/* Selected items toolbar */}
      {selectedProducts.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-blue-900 text-sm">
                {selectedProducts.size} ürün seçildi
              </span>
              <button onClick={() => setShowBulkEdit(!showBulkEdit)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                {showBulkEdit ? '✕ İptal' : '✏️ Toplu Düzenle'}
              </button>
              <button onClick={handleBulkDelete} disabled={bulkLoading} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
                {bulkLoading ? 'Siliniyor...' : '🗑️ Seçilenleri Sil'}
              </button>
            </div>
            <button onClick={() => setSelectedProducts(new Set())} className="text-sm text-blue-600 hover:underline">
              Seçimi Temizle
            </button>
          </div>

          {showBulkEdit && (
            <div className="mt-4 bg-white p-4 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Para Birimi <span className="text-gray-400 font-normal">(boş = değişmez)</span></label>
                  <select value={bulkEditData.currency} onChange={e => setBulkEditData({...bulkEditData, currency: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">-- Değiştirme --</option>
                    <option value="TRY">TL (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Birim <span className="text-gray-400 font-normal">(boş = değişmez)</span></label>
                  <input type="text" value={bulkEditData.unit} onChange={e => setBulkEditData({...bulkEditData, unit: e.target.value})} placeholder="adet, metre, kg" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fiyat Çarpanı <span className="text-gray-400 font-normal">(1.1 = %10 artış)</span></label>
                  <input type="number" step="0.01" value={bulkEditData.price_multiplier} onChange={e => setBulkEditData({...bulkEditData, price_multiplier: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <button onClick={handleBulkUpdate} disabled={bulkLoading} className="mt-3 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                {bulkLoading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-center p-3 w-10">
                  <input type="checkbox" checked={selectedProducts.size === products.length && products.length > 0} onChange={selectAll} className="w-4 h-4 text-blue-600 cursor-pointer rounded" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kod</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tip</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Çap</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fiyat</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Birim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Açıklama</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && products.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Yükleniyor...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">
                  {search ? 'Arama sonucu bulunamadı.' : 'Henüz ürün eklenmemiş.'}
                </td></tr>
              ) : products.map(product => (
                <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${selectedProducts.has(product.id) ? 'bg-blue-50' : ''}`}>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleProductSelection(product.id)} className="w-4 h-4 text-blue-600 cursor-pointer rounded" />
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-800 font-medium">{product.product_code}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center gap-2">
                      {product.product_type}
                      {product.product_type === 'Tanımsız Ürün' && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">⚠ Tanımsız</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{product.diameter || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {product.base_price > 0 ? (
                      <span className="font-medium text-gray-800">{product.base_price.toFixed(2)} {getCurrencySymbol(product.currency)}</span>
                    ) : (
                      <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded">Fiyat sorunuz</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.unit}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{product.description || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-center">
                      <button onClick={() => handleEdit(product)} className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
                        Düzenle
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="px-3 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors">
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {totalCount.toLocaleString('tr-TR')} ürün gösteriliyor
      </p>
    </div>
  )
}
