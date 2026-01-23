'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

type ProductRow = {
  product_type: string
  diameter: string | null
  product_code: string
  base_price: number
  currency: string
  unit: string
  description?: string
}

type ImportError = {
  product_code: string
  error: string
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [preview, setPreview] = useState<ProductRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentSheet: '' })
  const [result, setResult] = useState<{ success: number; failed: number; errors?: ImportError[] } | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)
    setPreview([])
    setSelectedSheets([])

    // Parse Excel
    const data = await selectedFile.arrayBuffer()
    const workbook = XLSX.read(data)

    // Tüm sheet isimlerini al
    setSheetNames(workbook.SheetNames)

    // İlk sheet'i otomatik seç ve önizle
    if (workbook.SheetNames.length > 0) {
      const firstSheet = workbook.SheetNames[0]
      setSelectedSheets([firstSheet])

      const worksheet = workbook.Sheets[firstSheet]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      // Convert to our format
      const products: ProductRow[] = jsonData.map((row) => {
        const diameter = row['Çap'] || row['diameter']
        return {
          product_type: String(row['Ürün Tipi'] || row['product_type'] || ''),
          diameter: diameter ? String(diameter) : null,
          product_code: String(row['Ürün Kodu'] || row['product_code'] || ''),
          base_price: Number(row['Birim Fiyat'] || row['base_price'] || 0),
          currency: String(row['Para Birimi'] || row['currency'] || 'TL'),
          unit: String(row['Birim'] || row['unit'] || ''),
          description: String(row['Açıklama'] || row['description'] || ''),
        }
      })

      setPreview(products.slice(0, 10)) // İlk 10 satırı göster
    }
  }

  const handleSheetSelection = async (sheetName: string, checked: boolean) => {
    let newSelection: string[]

    if (checked) {
      newSelection = [...selectedSheets, sheetName]
    } else {
      newSelection = selectedSheets.filter(s => s !== sheetName)
    }

    setSelectedSheets(newSelection)

    // İlk seçili sheet'in önizlemesini göster
    if (newSelection.length > 0 && file) {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[newSelection[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const products: ProductRow[] = jsonData.map((row) => {
        const diameter = row['Çap'] || row['diameter']
        return {
          product_type: String(row['Ürün Tipi'] || row['product_type'] || ''),
          diameter: diameter ? String(diameter) : null,
          product_code: String(row['Ürün Kodu'] || row['product_code'] || ''),
          base_price: Number(row['Birim Fiyat'] || row['base_price'] || 0),
          currency: String(row['Para Birimi'] || row['currency'] || 'TL'),
          unit: String(row['Birim'] || row['unit'] || ''),
          description: String(row['Açıklama'] || row['description'] || ''),
        }
      })

      setPreview(products.slice(0, 10))
    } else {
      setPreview([])
    }
  }

  const handleImport = async () => {
    if (!file || selectedSheets.length === 0) return

    setImporting(true)
    setResult(null)
    setImportProgress({ current: 0, total: selectedSheets.length, currentSheet: '' })

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)

      // Tüm seçili sheet'lerden ürünleri topla
      let allProducts: ProductRow[] = []

      for (let i = 0; i < selectedSheets.length; i++) {
        const sheetName = selectedSheets[i]
        setImportProgress({ current: i + 1, total: selectedSheets.length, currentSheet: sheetName })

        console.log(`[${i + 1}/${selectedSheets.length}] İşleniyor: ${sheetName}`)

        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        console.log(`  → ${sheetName}: ${jsonData.length} satır bulundu`)

        // İlk satırın sütun isimlerini göster (debug için)
        if (jsonData.length > 0 && i === 0) {
          console.log('  → İlk satırdaki sütun isimleri:', Object.keys(jsonData[0]))
        }

        const products: ProductRow[] = jsonData.map((row, rowIndex) => {
          const diameter = row['Çap'] || row['diameter'] || row['Cap']
          const product_type = String(row['Ürün Tipi'] || row['product_type'] || row['Urun Tipi'] || row['ÜRÜN TİPİ'] || row['URUN TIPI'] || '')
          const product_code = String(row['Ürün Kodu'] || row['product_code'] || row['Urun Kodu'] || row['ÜRÜN KODU'] || row['URUN KODU'] || row['Kod'] || row['KOD'] || '')

          // Debug için ilk 3 satırda boş değerleri logla
          if (i === 0 && rowIndex < 3 && (!product_type || !product_code)) {
            console.warn(`  ⚠️ Satır ${rowIndex + 1}: Tip='${product_type}' Kod='${product_code}'`)
            console.warn(`     Satır ham verisi:`, row)
          }

          return {
            product_type,
            diameter: diameter ? String(diameter) : null,
            product_code,
            base_price: Number(row['Birim Fiyat'] || row['base_price'] || row['Fiyat'] || row['FIYAT'] || 0),
            currency: String(row['Para Birimi'] || row['currency'] || row['Para Birim'] || row['Birim'] || 'TL'),
            unit: String(row['Birim'] || row['unit'] || row['BIRIM'] || 'adet'),
            description: String(row['Açıklama'] || row['description'] || row['AÇIKLAMA'] || ''),
          }
        })

        allProducts = allProducts.concat(products)
      }

      console.log(`Toplam ${allProducts.length} ürün veritabanına gönderiliyor...`)
      setImportProgress({ current: selectedSheets.length, total: selectedSheets.length, currentSheet: 'Veritabanına kaydediliyor...' })

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: allProducts }),
      })

      const result = await response.json()
      console.log('Import tamamlandı:', result)
      setResult(result)
    } catch (error) {
      console.error('Import hatası:', error)
      alert('Import sırasında hata oluştu')
    } finally {
      setImporting(false)
      setImportProgress({ current: 0, total: 0, currentSheet: '' })
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Excel Import</h1>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4">Excel Formatı</h2>
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-800">
            ℹ️ <strong>İpucu:</strong> Büyük dosyalarda ilerlemeyi takip etmek için tarayıcınızın geliştirici konsolunu açın (F12) ve Console sekmesine bakın.
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded text-sm">
          <p className="mb-2">Excel dosyanız aşağıdaki sütunları içermelidir:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>Ürün Tipi</strong> veya <strong>product_type</strong> (Zorunlu)</li>
            <li><strong>Ürün Kodu</strong> veya <strong>product_code</strong> (Zorunlu, Benzersiz olmalı)</li>
            <li><strong>Çap</strong> veya <strong>diameter</strong> (Opsiyonel - boş bırakılabilir)</li>
            <li><strong>Birim Fiyat</strong> veya <strong>base_price</strong> (Opsiyonel - boş ise 0 olarak kaydedilir)</li>
            <li><strong>Para Birimi</strong> veya <strong>currency</strong> (TL/USD/EUR, varsayılan: TL)</li>
            <li><strong>Birim</strong> veya <strong>unit</strong> (Opsiyonel, varsayılan: adet)</li>
            <li><strong>Açıklama</strong> veya <strong>description</strong> (Opsiyonel)</li>
          </ul>
          <p className="mt-3 text-yellow-700 font-medium">
            ⚠️ Fiyatı olmayan ürünler (0 TL) için teklif oluşturulurken "Fiyat sorunuz" uyarısı gösterilir.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4">Dosya Yükle</h2>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {file && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Seçili dosya: <strong>{file.name}</strong>
            </p>
          </div>
        )}
      </div>

      {sheetNames.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Sheet Seçimi ({sheetNames.length} sheet bulundu)
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            İçeri aktarmak istediğiniz sheet'leri seçin. Birden fazla seçebilirsiniz.
          </p>

          <div className="space-y-2">
            {sheetNames.map((sheetName) => (
              <label
                key={sheetName}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSheets.includes(sheetName)}
                  onChange={(e) => handleSheetSelection(sheetName, e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="font-medium text-gray-800">{sheetName}</span>
              </label>
            ))}
          </div>

          {selectedSheets.length > 1 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ {selectedSheets.length} sheet seçildi. Tüm sheet'ler tek seferde içeri aktarılacak.
              </p>
            </div>
          )}
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Önizleme: {selectedSheets[0]} (İlk 10 Satır)
          </h2>
          {selectedSheets.length > 1 && (
            <p className="text-sm text-gray-600 mb-4">
              Diğer seçili sheet'ler: {selectedSheets.slice(1).join(', ')}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Ürün Tipi</th>
                  <th className="text-left py-2 px-3">Çap</th>
                  <th className="text-left py-2 px-3">Kod</th>
                  <th className="text-right py-2 px-3">Fiyat</th>
                  <th className="text-left py-2 px-3">Para Birimi</th>
                  <th className="text-left py-2 px-3">Birim</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 px-3">{row.product_type}</td>
                    <td className="py-2 px-3">{row.diameter || '-'}</td>
                    <td className="py-2 px-3">{row.product_code}</td>
                    <td className="py-2 px-3 text-right">{row.base_price.toFixed(2)}</td>
                    <td className="py-2 px-3">{row.currency}</td>
                    <td className="py-2 px-3">{row.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={importing || selectedSheets.length === 0}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {importing
              ? 'İçeri Aktarılıyor...'
              : selectedSheets.length > 1
              ? `${selectedSheets.length} Sheet'i İçeri Aktar`
              : 'İçeri Aktar'}
          </button>

          {/* Progress Bar */}
          {importing && importProgress.total > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900">
                  {importProgress.current}/{importProgress.total} sheet işleniyor
                </span>
                <span className="text-blue-700">
                  {Math.round((importProgress.current / importProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-blue-700">
                {importProgress.currentSheet}
              </p>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">İçeri Aktarma Sonucu</h2>
          <div className="space-y-4">
            <div className="flex gap-8">
              <p className="text-green-600 font-semibold">✓ Başarılı: {result.success}</p>
              <p className="text-red-600 font-semibold">✗ Başarısız: {result.failed}</p>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-red-700 mb-2">Başarısız Olan Ürünler:</h3>
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium">Ürün Kodu</th>
                        <th className="text-left py-2 px-3 font-medium">Hata Nedeni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, idx) => (
                        <tr key={idx} className="border-t border-red-100">
                          <td className="py-2 px-3 font-medium">{err.product_code || '-'}</td>
                          <td className="py-2 px-3 text-red-600">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.failed > 10 && (
                  <p className="text-sm text-gray-600 mt-2">
                    * İlk 10 hata gösteriliyor. Toplam {result.failed} başarısız kayıt var.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
