'use client'

import { useState } from 'react'

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

type MatchResult = {
  product_id: string
  product: Product
  confidence: number
  strategy: 'exact' | 'fulltext' | 'vector' | 'ai'
  reasoning: string
}

type ProductSelectionModalProps = {
  isOpen: boolean
  matches: MatchResult[]
  message: string
  onSelect: (product: Product, match: MatchResult) => void
  onCancel: () => void
}

export default function ProductSelectionModal({
  isOpen,
  matches,
  message,
  onSelect,
  onCancel
}: ProductSelectionModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      const match = matches[selectedIndex]
      onSelect(match.product, match)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold">🔍 Birden Fazla Ürün Bulundu</h2>
          <p className="text-blue-100 text-sm mt-1">{message}</p>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {matches.map((match, index) => (
              <div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`
                  border-2 rounded-lg p-4 cursor-pointer transition-all
                  ${selectedIndex === index
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {/* Radio Button */}
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${selectedIndex === index ? 'border-blue-500' : 'border-gray-300'}
                      `}>
                        {selectedIndex === index && (
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {match.product.product_type}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                            {match.product.product_code}
                          </span>
                          {match.product.diameter && (
                            <span>Çap: {match.product.diameter}</span>
                          )}
                        </div>
                        {match.product.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {match.product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Confidence */}
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-gray-900">
                      {match.product.base_price.toLocaleString('tr-TR')} {match.product.currency}
                    </div>
                    <div className="text-xs text-gray-500">
                      {match.product.unit}
                    </div>
                    <div className={`
                      mt-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium
                      ${match.confidence >= 0.9 ? 'bg-green-100 text-green-800' :
                        match.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      %{(match.confidence * 100).toFixed(0)} eşleşme
                    </div>
                  </div>
                </div>

                {/* Reasoning (Debug Info) */}
                {match.reasoning && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Neden:</span> {match.reasoning}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedIndex !== null ? (
              <span className="text-green-600 font-medium">
                ✓ {matches[selectedIndex].product.product_type} seçildi
              </span>
            ) : (
              <span>Lütfen bir ürün seçin</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIndex === null}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors
                ${selectedIndex !== null
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Seçimi Onayla
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
