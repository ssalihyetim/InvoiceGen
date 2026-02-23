'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

type ImageUploadTabProps = {
  products: {
    id: string
    product_type: string
    diameter: string
    product_code: string
    base_price: number
    unit: string
    description: string | null
  }[]
  onProductsExtracted: (requests: { talep: string; miktar: number }[]) => void
}

const resizeImageToBase64 = (dataUrl: string, maxDim: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = dataUrl
  })
}

export default function ImageUploadTab({ onProductsExtracted }: ImageUploadTabProps) {
  const [image, setImage] = useState<string | null>(null)
  const [extractedRequests, setExtractedRequests] = useState<{ talep: string; miktar: number }[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImage(reader.result as string)
        setExtractedRequests([])
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'] },
    multiple: false,
  })

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = () => {
            setImage(reader.result as string)
            setExtractedRequests([])
            setError(null)
          }
          reader.readAsDataURL(blob)
        }
        break
      }
    }
  }

  const processImageWithAI = async () => {
    if (!image) return
    setProcessing(true)
    setError(null)
    try {
      const resized = await resizeImageToBase64(image, 1024)
      const res = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: resized }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Görsel analiz edilemedi.')
        return
      }
      if (!data.requests || data.requests.length === 0) {
        setError('Görselde ürün talebi bulunamadı. Daha net bir görsel deneyin.')
        return
      }
      setExtractedRequests(data.requests)
    } catch (err: any) {
      setError(err.message ?? 'Beklenmeyen hata.')
    } finally {
      setProcessing(false)
    }
  }

  const updateRequest = (index: number, field: 'talep' | 'miktar', value: string) => {
    setExtractedRequests((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, [field]: field === 'miktar' ? (parseFloat(value) || 1) : value }
          : r
      )
    )
  }

  const removeRequest = (index: number) => {
    setExtractedRequests((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirmRequests = async () => {
    if (extractedRequests.length === 0) return
    setProcessing(true)
    try {
      await onProductsExtracted(extractedRequests)
      setImage(null)
      setExtractedRequests([])
    } catch (err: any) {
      setError(err.message ?? 'Eşleştirme sırasında hata oluştu.')
    } finally {
      setProcessing(false)
    }
  }

  // View 1 — no image
  if (!image) {
    return (
      <div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-gray-600">
              {isDragActive ? 'Dosyayı buraya bırakın' : 'Görseli sürükle-bırak veya tıkla'}
            </p>
            <p className="text-sm text-gray-400">PNG, JPG, GIF desteklenir</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">veya</p>
          <div
            onPaste={handlePaste}
            tabIndex={0}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 focus:border-blue-500 focus:outline-none"
          >
            <p className="text-gray-600">Ctrl+V ile görseli buraya yapıştır</p>
          </div>
        </div>
      </div>
    )
  }

  // View 3 — extracted requests editable table
  if (extractedRequests.length > 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">
            Tespit Edilen Ürünler ({extractedRequests.length} kalem) — Düzenlenebilir
          </h3>
          <button
            onClick={() => { setImage(null); setExtractedRequests([]) }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Yeni Görsel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Ürün Adı / Kodu</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-24">Miktar</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {extractedRequests.map((req, i) => (
                <tr key={i} className="border-t border-gray-200">
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={req.talep}
                      onChange={(e) => updateRequest(i, 'talep', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={req.miktar}
                      min={1}
                      onChange={(e) => updateRequest(i, 'miktar', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => removeRequest(i)}
                      className="text-red-500 hover:text-red-700 font-bold"
                      title="Sil"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleConfirmRequests}
          disabled={processing || extractedRequests.length === 0}
          className="mt-4 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
        >
          {processing ? '⏳ Eşleştiriliyor...' : `✓ Ürünleri Eşleştir (${extractedRequests.length} kalem)`}
        </button>
      </div>
    )
  }

  // View 2 — image loaded, not yet analyzed
  return (
    <div>
      <div className="relative">
        <img src={image} alt="Yüklenen görsel" className="max-h-96 mx-auto rounded-lg border" />
        <button
          onClick={() => setImage(null)}
          className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700"
        >
          ✕ Kaldır
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-2">
        <button
          onClick={processImageWithAI}
          disabled={processing}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {processing ? '⏳ Analiz ediliyor...' : '✨ AI ile Analiz Et'}
        </button>
        <p className="text-sm text-gray-500 text-center">
          GPT-4o Vision ile otomatik ürün ve miktar tespiti. 3-8 saniye sürebilir.
        </p>
      </div>
    </div>
  )
}
