'use client'

import { useState, useEffect } from 'react'

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

type PendingMatch = {
  originalRequest: string
  quantity: number
  matches: MatchResult[]
  selectedIndex: number | null
}

type BatchMultiMatchModalProps = {
  isOpen: boolean
  pendingMatches: PendingMatch[]
  onConfirmAll: (selections: { request: string, product: Product, quantity: number, match: MatchResult }[]) => void
  onCancel: () => void
}

export default function BatchMultiMatchModal({
  isOpen,
  pendingMatches,
  onConfirmAll,
  onCancel
}: BatchMultiMatchModalProps) {
  const [localSelections, setLocalSelections] = useState<Record<number, number>>({})

  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelections({})
    }
  }, [isOpen])

  if (!isOpen || pendingMatches.length === 0) return null

  const handleSelect = (pendingIndex: number, matchIndex: number) => {
    setLocalSelections(prev => ({
      ...prev,
      [pendingIndex]: matchIndex
    }))
  }

  const handleConfirm = () => {
    const selections = pendingMatches
      .map((pending, idx) => {
        const selectedIdx = localSelections[idx]
        if (selectedIdx === undefined) return null

        const match = pending.matches[selectedIdx]
        return {
          request: pending.originalRequest,
          product: match.product,
          quantity: pending.quantity,
          match
        }
      })
      .filter(Boolean) as any[]

    onConfirmAll(selections)
  }

  const allSelected = pendingMatches.every((_, idx) => localSelections[idx] !== undefined)
  const selectedCount = Object.keys(localSelections).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex-shrink-0">
          <h2 className="text-xl font-bold">🔍 Birden Fazla Belirsiz Talep Bulundu</h2>
          <p className="text-blue-100 text-sm mt-1">
            Aşağıdaki {pendingMatches.length} talep için birden fazla ürün eşleşti. Lütfen her biri için uygun olanı seçin.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-gray-50 px-6 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              İlerleme: <span className="font-bold text-gray-900">{selectedCount}/{pendingMatches.length}</span> seçim yapıldı
            </span>
            <div className="flex gap-2">
              {pendingMatches.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                    localSelections[idx] !== undefined
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {pendingMatches.map((pending, pendingIdx) => (
              <div key={pendingIdx} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                {/* Request Header */}
                <div className="mb-4 pb-3 border-b border-gray-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                          {pendingIdx + 1}
                        </span>
                        Müşteri Talebi: <span className="text-blue-600">"{pending.originalRequest}"</span>
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Miktar: <span className="font-semibold">{pending.quantity}</span> adet
                        {' • '}
                        <span className="text-yellow-600">{pending.matches.length} ürün eşleşti</span>
                      </p>
                    </div>
                    {localSelections[pendingIdx] !== undefined && (
                      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        ✓ Seçildi
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Options */}
                <div className="space-y-2">
                  {pending.matches.map((match, matchIdx) => (
                    <div
                      key={matchIdx}
                      onClick={() => handleSelect(pendingIdx, matchIdx)}
                      className={`
                        border-2 rounded-lg p-3 cursor-pointer transition-all
                        ${localSelections[pendingIdx] === matchIdx
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 flex items-start gap-3">
                          {/* Radio Button */}
                          <div className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                            ${localSelections[pendingIdx] === matchIdx ? 'border-blue-500' : 'border-gray-300'}
                          `}>
                            {localSelections[pendingIdx] === matchIdx && (
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {match.product.product_type}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                                {match.product.product_code}
                              </span>
                              {match.product.diameter && (
                                <span>Çap: {match.product.diameter}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price & Confidence */}
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-sm font-bold text-gray-900">
                            {match.product.base_price.toLocaleString('tr-TR')} {match.product.currency}
                          </div>
                          <div className="text-xs text-gray-500">
                            {match.product.unit}
                          </div>
                          <div className={`
                            mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                            ${match.confidence >= 0.9 ? 'bg-green-100 text-green-800' :
                              match.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'}
                          `}>
                            %{(match.confidence * 100).toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="text-sm">
            {allSelected ? (
              <span className="text-green-600 font-medium">
                ✓ Tüm talepler için seçim yapıldı ({selectedCount}/{pendingMatches.length})
              </span>
            ) : (
              <span className="text-yellow-600 font-medium">
                ⚠ {pendingMatches.length - selectedCount} talep için seçim yapmanız gerekiyor
              </span>
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
              disabled={!allSelected}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors
                ${allSelected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Tümünü Onayla ({selectedCount}/{pendingMatches.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
