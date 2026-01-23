'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createWorker } from 'tesseract.js'

type Product = {
  id: string
  product_type: string
  diameter: string
  product_code: string
  base_price: number
  unit: string
  description: string | null
}

type ImageUploadTabProps = {
  products: Product[]
  onProductsExtracted: (requests: { talep: string, miktar: number }[]) => void
}

export default function ImageUploadTab({ products, onProductsExtracted }: ImageUploadTabProps) {
  const [image, setImage] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImage(reader.result as string)
        setExtractedText('')
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    },
    multiple: false
  })

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = () => {
            setImage(reader.result as string)
            setExtractedText('')
          }
          reader.readAsDataURL(blob)
        }
        break
      }
    }
  }

  const performOCR = async () => {
    if (!image) return

    setProcessing(true)
    setProgress(0)

    try {
      const worker = await createWorker('tur', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        }
      })

      const { data: { text } } = await worker.recognize(image)
      await worker.terminate()

      setExtractedText(text)
      setProgress(100)
    } catch (error) {
      console.error('OCR Error:', error)
      alert('Görsel okunamadı. Lütfen daha net bir görsel deneyin.')
    } finally {
      setProcessing(false)
    }
  }

  const parseTextToRequests = () => {
    const lines = extractedText.split('\n').filter(line => line.trim())
    const requests: { talep: string, miktar: number }[] = []

    for (const line of lines) {
      let miktar = 1
      let cleanLine = line

      // Başındaki numaraları kaldır (1., 2), 3-, vb.)
      cleanLine = cleanLine.replace(/^\d+[\.\)\-\:]\s*/, '')

      // Tüm sayı+birim kombinasyonlarını bul
      const quantityPatterns = [
        /(\d+(?:[.,]\d+)?)\s*(adet|ad|adt)/gi,
        /(\d+(?:[.,]\d+)?)\s*(metre|meter|mt|m)/gi,
        /(\d+(?:[.,]\d+)?)\s*(kilogram|kg|kilo)/gi,
        /(\d+(?:[.,]\d+)?)\s*(litre|lt|l)/gi,
        /(\d+(?:[.,]\d+)?)\s*(ton|tn)/gi,
      ]

      // İlk bulunan miktarı al
      for (const pattern of quantityPatterns) {
        const match = cleanLine.match(pattern)
        if (match) {
          // İlk eşleşmedeki sayıyı al
          const numberMatch = match[0].match(/(\d+(?:[.,]\d+)?)/)
          if (numberMatch) {
            miktar = parseFloat(numberMatch[1].replace(',', '.'))
            break
          }
        }
      }

      // Miktar bilgisini metnin tamamından kaldır (tüm pattern'lar için)
      let talep = cleanLine
      quantityPatterns.forEach(pattern => {
        talep = talep.replace(pattern, '')
      })

      // Fazla boşlukları temizle
      talep = talep.replace(/\s+/g, ' ').trim()

      // En az 3 karakter ve sadece miktar değil
      if (talep.length > 3 && !/^\d+$/.test(talep)) {
        requests.push({ talep, miktar })
        console.log('Parsed:', { talep, miktar, original: line })
      }
    }

    return requests
  }

  const handleAnalyze = async () => {
    const requests = parseTextToRequests()

    console.log('Parsed requests:', requests)

    if (requests.length === 0) {
      alert('Hiç ürün talebi tespit edilemedi. Metni düzenleyip tekrar deneyin.')
      return
    }

    // Kullanıcıya feedback
    setProcessing(true)

    try {
      await onProductsExtracted(requests)

      // Başarılı mesajı
      alert(`✓ ${requests.length} talep işlendi!\n\nÜrünler tabloya eklendi. Teklif kalemlerine bakın.`)

      // Formu sıfırla
      setImage(null)
      setExtractedText('')
    } catch (error) {
      console.error('Analyze error:', error)
      alert('❌ Analiz sırasında hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      {/* Görsel Yükleme */}
      {!image && (
        <div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-2">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
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
              <p className="text-gray-600">
                Ctrl+V ile görseli buraya yapıştır
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Görsel Önizleme */}
      {image && !extractedText && (
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

          <div className="mt-4 space-y-2">
            <button
              onClick={performOCR}
              disabled={processing}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {processing ? `İşleniyor... %${progress}` : '🔍 OCR ile Metni Çıkar (Ücretsiz)'}
            </button>
            <p className="text-sm text-gray-500 text-center">
              Türkçe karakterler desteklenir. İşlem 5-15 saniye sürebilir.
            </p>
          </div>
        </div>
      )}

      {/* Çıkarılan Metin */}
      {extractedText && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Çıkarılan Metin (Düzenlenebilir)</h3>
            <button
              onClick={() => {
                setImage(null)
                setExtractedText('')
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Yeni Görsel
            </button>
          </div>

          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            className="w-full h-64 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder="OCR sonucu buraya yazılacak..."
          />

          <div className="mt-4 space-y-2">
            <button
              onClick={handleAnalyze}
              disabled={processing}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
            >
              {processing ? '⏳ Analiz ediliyor...' : '✓ Analiz Et ve Ürünleri Eşleştir'}
            </button>
            <p className="text-xs text-gray-500">
              Her satır bir teklif talebi olarak işlenecek. AI otomatik ürün eşleştirecek.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
