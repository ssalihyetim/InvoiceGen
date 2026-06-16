'use client'

import { useState } from 'react'

export type ManualProductInput = {
  name: string
  code: string
  unit: string
  price: number
  currency: string
  addToCatalog: boolean
}

type Props = {
  isOpen: boolean
  defaultCurrency?: string
  onAdd: (input: ManualProductInput) => void
  onCancel: () => void
}

// F1: add an off-catalog (manual) line item — a product that is NOT in the product DB.
export default function ManualProductModal({ isOpen, defaultCurrency = 'EUR', onAdd, onCancel }: Props) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [unit, setUnit] = useState('adet')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [addToCatalog, setAddToCatalog] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const reset = () => {
    setName('')
    setCode('')
    setUnit('adet')
    setPrice('')
    setCurrency(defaultCurrency)
    setAddToCatalog(false)
    setError('')
  }

  const handleAdd = () => {
    if (!name.trim()) {
      setError('Ürün adı zorunludur.')
      return
    }
    const parsed = price ? parseFloat(price) : 0
    if (isNaN(parsed) || parsed < 0) {
      setError('Geçersiz fiyat.')
      return
    }
    onAdd({
      name: name.trim(),
      code: code.trim(),
      unit: unit.trim() || 'adet',
      price: parsed,
      currency,
      addToCatalog,
    })
    reset()
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">➕ Manuel Ürün Ekle</h3>
          <p className="text-sm text-gray-500 mt-1">Ürün listede yoksa buradan ekleyebilirsiniz.</p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ürün Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Örn: Özel imalat flanş"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[44px] text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Kodu <span className="text-gray-400 text-xs">(ops.)</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="—"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[44px] text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="adet, metre, kg..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[44px] text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Liste Fiyatı <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[44px] text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[44px] text-base"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="TRY">TL (₺)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={addToCatalog}
              onChange={(e) => setAddToCatalog(e.target.checked)}
              className="w-4 h-4"
            />
            Bu ürünü ana kataloğa da ekle
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-5 border-t flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 min-h-[44px]"
          >
            İptal
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px] font-medium"
          >
            Ekle
          </button>
        </div>
      </div>
    </div>
  )
}
