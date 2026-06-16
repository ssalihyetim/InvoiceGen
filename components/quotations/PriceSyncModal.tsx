'use client'

import { getCurrencySymbol } from '@/lib/pricing'
import type { EditedCatalogPrice } from '@/lib/quote-items'

type Props = {
  isOpen: boolean
  changes: EditedCatalogPrice[]
  saving?: boolean
  onConfirm: () => void // save edited prices to the catalog, then continue saving the quote
  onSkip: () => void // keep edits only on this quote, continue saving the quote
  onCancel: () => void // abort the save entirely
}

// F3: when the user edited one or more catalog list prices on the quote, ask whether to
// push those changes back to the Main List (products catalog) before saving the quote.
export default function PriceSyncModal({ isOpen, changes, saving, onConfirm, onSkip, onCancel }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Liste fiyatı değişiklikleri</h3>
          <p className="text-sm text-gray-600 mt-1">
            Bu teklifte {changes.length} ürünün liste fiyatını değiştirdiniz. Bu değişiklikleri
            <strong> Ana Listeye (ürün kataloğuna)</strong> da kaydedeyim mi?
          </p>
        </div>

        <div className="p-5">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Kod</th>
                  <th className="text-left p-2">Ürün</th>
                  <th className="text-right p-2">Eski</th>
                  <th className="text-right p-2">Yeni</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c) => {
                  const sym = getCurrencySymbol(c.currency)
                  return (
                    <tr key={c.product_id} className="border-t">
                      <td className="p-2 font-mono text-xs">{c.code || '—'}</td>
                      <td className="p-2">{c.name}</td>
                      <td className="p-2 text-right text-gray-400 line-through">
                        {c.oldPrice.toFixed(2)}
                        {sym}
                      </td>
                      <td className="p-2 text-right font-semibold text-green-700">
                        {c.newPrice.toFixed(2)}
                        {sym}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 border-t flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 min-h-[44px]"
          >
            Vazgeç
          </button>
          <button
            onClick={onSkip}
            disabled={saving}
            className="px-4 py-2 text-gray-800 bg-yellow-100 rounded-lg hover:bg-yellow-200 disabled:opacity-50 min-h-[44px] font-medium"
          >
            Hayır, sadece bu teklifte
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 min-h-[44px] font-medium"
          >
            {saving ? 'Kaydediliyor...' : 'Evet, kataloğa kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
