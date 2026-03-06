'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'

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

type ImportHistory = {
  id: string
  file_name: string
  file_size: number
  total_rows: number
  successful_imports: number
  failed_imports: number
  error_log: any
  created_at: string
}

// Key normalization: handles trailing/leading spaces and case variations
// (e.g. "base_price " === "base_price", "FİYAT" === "fiyat")
const normalizeKey = (key: string): string => key.toLocaleLowerCase('tr-TR').trim()

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [preview, setPreview] = useState<ProductRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentSheet: '' })
  const [result, setResult] = useState<{ success: number; failed: number; errors?: ImportError[] } | null>(null)

  // Upload history state
  const [showHistory, setShowHistory] = useState(false)
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const parseProductRow = (row: any): ProductRow => {
    // Normalize all row keys to handle leading/trailing spaces and case inconsistencies
    // e.g. "base_price " (trailing space) and "BASE_PRICE" both map to "base_price"
    const nr: Record<string, any> = {}
    for (const key of Object.keys(row)) {
      nr[normalizeKey(key)] = row[key]
    }

    // Get first non-empty value from normalized row by trying multiple field name variants
    const lookup = (fields: string[]): any => {
      for (const field of fields) {
        const v = nr[normalizeKey(field)]
        if (v !== undefined && v !== null && v !== '') return v
      }
      return undefined
    }

    // Çap/Diameter - tüm olası sütun adları
    const diameterVal = lookup(['Çap', 'ÇAP', 'diameter', 'Cap', 'Diameter'])
    const diameter = diameterVal !== undefined ? String(diameterVal) : null

    // Fiyat parsing - TÜM olası sütun adları + güçlendirilmiş format desteği
    let basePrice = 0
    const priceFields = [
      'FİYAT', 'Fiyat', 'FIYAT',  // Excel'deki gerçek sütun adı
      'Birim Fiyat', 'base_price', 'Birim Fiyati',
      'Unit Price', 'Price', 'BirimFiyat', 'BIRIM_FIYAT'
    ]

    for (const field of priceFields) {
      const rawValue = nr[normalizeKey(field)]
      if (rawValue === undefined || rawValue === null || rawValue === '') continue

      // NaN fix: typeof NaN === 'number' is true in JS, so we must check explicitly
      // XLSX returns NaN for empty/error numeric-formatted cells
      // Date fix: Excel date serials (e.g. 46217 = 2026-07-11) appear as large numbers.
      //   With cellDates:true they come back as JS Date objects — skip those.
      if (rawValue instanceof Date) continue
      if (typeof rawValue === 'number' && !isNaN(rawValue) && isFinite(rawValue)) {
        basePrice = rawValue
        break
      }

      // String ise parse et (Türkçe format desteği: 1.500,50)
      let priceStr = String(rawValue).trim()
      if (!priceStr) continue

      // Para birimi sembollerini temizle (₺, TL, $, €, EUR, USD)
      priceStr = priceStr.replace(/[₺$€]/g, '').replace(/\s*(TL|EUR|USD)\s*/gi, '').trim()

      // Türkçe binlik ayraç: "1.500" veya "12.500" → "1500" / "12500"
      // (nokta binlik ayraç, ondalık yok — parseFloat("1.500") yanlış 1.5 verir)
      if (/^\d{1,3}(\.\d{3})+$/.test(priceStr)) {
        priceStr = priceStr.replace(/\./g, '')
      }

      // Türkçe format: binlik ayraç (.) ve ondalık (,) → İngilizce format
      // Örnek: "1.500,50" → "1500.50"
      if (priceStr.includes(',') && priceStr.includes('.')) {
        priceStr = priceStr.replace(/\./g, '').replace(',', '.')
      } else if (priceStr.includes(',')) {
        priceStr = priceStr.replace(',', '.')
      }

      const parsed = parseFloat(priceStr)
      if (!isNaN(parsed) && parsed > 0) {
        basePrice = parsed
        break
      }
    }

    // Para Birimi - TÜM olası sütun adları
    let currency = 'EUR'  // Varsayılan EUR
    const currencyFields = [
      'Para Birimi', 'PARA BİRİMİ', 'Para Birim', 'ParaBirimi',
      'currency', 'Currency', 'CURRENCY', 'Birim', 'BIRIM'
    ]

    for (const field of currencyFields) {
      const rawCurrency = nr[normalizeKey(field)]
      if (rawCurrency === undefined || rawCurrency === null || rawCurrency === '') continue

      const rawCurrencyStr = String(rawCurrency).toUpperCase().trim()
      if (rawCurrencyStr === 'TL' || rawCurrencyStr === '₺') {
        currency = 'TRY'
        break
      }
      if (['TRY', 'USD', 'EUR', 'DOLLAR', 'EURO'].includes(rawCurrencyStr)) {
        if (rawCurrencyStr === 'DOLLAR') currency = 'USD'
        else if (rawCurrencyStr === 'EURO') currency = 'EUR'
        else currency = rawCurrencyStr
        break
      }
    }

    // Ürün Tipi - TÜM olası sütun adları (ADI, __EMPTY, ÜRÜN ADI)
    const productType = lookup([
      'ADI', 'ÜRÜN ADI', '__EMPTY',
      'Ürün Tipi', 'product_type', 'Urun Tipi',
      'ÜRÜN TİPİ', 'URUN TIPI', 'Description'
    ]) ?? ''

    // Ürün Kodu - key normalization trailing-space sorununu otomatik çözer (KOD, "KOD ")
    const productCodeVal = lookup([
      'KOD', 'KOD ', 'Kod',
      'Ürün Kodu', 'product_code', 'Urun Kodu',
      'ÜRÜN KODU', 'URUN KODU'
    ])
    const productCode = productCodeVal !== undefined ? String(productCodeVal).trim() : ''

    return {
      product_type: String(productType),
      diameter,
      product_code: productCode,
      base_price: basePrice,
      currency,
      unit: String(lookup(['Birim', 'unit', 'BIRIM']) ?? 'adet'),
      description: String(lookup(['Açıklama', 'description', 'AÇIKLAMA', 'Description']) ?? ''),
    }
  }

  const loadImportHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Import geçmişi yüklenemedi:', error)
        alert('Import geçmişi yüklenemedi: ' + error.message)
      } else {
        setImportHistory(data || [])
      }
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDeleteHistory = async (historyId: string, fileName: string) => {
    if (!confirm(`"${fileName}" import kaydı SİLİNECEK! Emin misiniz?\n\nBu işlem geri alınamaz.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('import_history')
        .delete()
        .eq('id', historyId)

      if (error) throw error

      alert('Import kaydı başarıyla silindi')
      loadImportHistory() // Reload history
    } catch (error) {
      console.error('Delete history error:', error)
      alert('Import kaydı silinirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)
    setPreview([])
    setSelectedSheets([])

    const fileName = selectedFile.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')

    if (isCSV) {
      // Parse CSV
      Papa.parse(selectedFile, {
        header: true,
        complete: (results) => {
          const jsonData = results.data as any[]
          const products: ProductRow[] = jsonData
            .filter(row => row['Ürün Kodu'] || row['product_code'] || row['Urun Kodu']) // Boş satırları filtrele
            .map(parseProductRow)

          setPreview(products.slice(0, 10))
          setSheetNames(['CSV'])
          setSelectedSheets(['CSV'])
        },
        error: (error) => {
          console.error('CSV parse hatası:', error)
          alert('CSV dosyası okunamadı: ' + error.message)
        }
      })
    } else {
      // Parse Excel
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data, { cellDates: true })

      // Tüm sheet isimlerini al
      setSheetNames(workbook.SheetNames)

      // İlk sheet'i otomatik seç ve önizle
      if (workbook.SheetNames.length > 0) {
        const firstSheet = workbook.SheetNames[0]
        setSelectedSheets([firstSheet])

        const worksheet = workbook.Sheets[firstSheet]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        // Convert to our format
        const products: ProductRow[] = jsonData.map(parseProductRow)

        setPreview(products.slice(0, 10)) // İlk 10 satırı göster
      }
    }
  }

  const handleSheetSelection = async (sheetName: string, checked: boolean) => {
    // CSV için sheet selection atla (sadece tek sheet var)
    if (file && file.name.toLowerCase().endsWith('.csv')) return

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
      const workbook = XLSX.read(data, { cellDates: true })
      const worksheet = workbook.Sheets[newSelection[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const products: ProductRow[] = jsonData.map(parseProductRow)

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
      const fileName = file.name.toLowerCase()
      const isCSV = fileName.endsWith('.csv')
      let allProducts: ProductRow[] = []

      if (isCSV) {
        // CSV import
        setImportProgress({ current: 1, total: 1, currentSheet: 'CSV dosyası işleniyor...' })

        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            complete: (results) => {
              const jsonData = results.data as any[]
              console.log(`CSV: ${jsonData.length} satır bulundu`)

              // İlk satırın sütun isimlerini göster
              if (jsonData.length > 0) {
                console.log('CSV sütun isimleri:', Object.keys(jsonData[0]))
              }

              const products: ProductRow[] = jsonData
                .filter(row => row['Ürün Kodu'] || row['product_code'] || row['Urun Kodu'])
                .map(parseProductRow)

              allProducts = products
              resolve()
            },
            error: (error) => {
              console.error('CSV parse hatası:', error)
              reject(error)
            }
          })
        })
      } else {
        // Excel import
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { cellDates: true })

        // Tüm seçili sheet'lerden ürünleri topla
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
            const product = parseProductRow(row)

            // Debug için ilk 3 satırda boş değerleri logla
            if (i === 0 && rowIndex < 3 && (!product.product_type || !product.product_code)) {
              console.warn(`  ⚠️ Satır ${rowIndex + 1}: Tip='${product.product_type}' Kod='${product.product_code}'`)
              console.warn(`     Satır ham verisi:`, row)
            }

            return product
          })

          allProducts = allProducts.concat(products)
        }
      }

      console.log(`Toplam ${allProducts.length} ürün veritabanına gönderiliyor...`)
      setImportProgress({ current: selectedSheets.length, total: selectedSheets.length, currentSheet: 'Veritabanına kaydediliyor...' })

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: allProducts,
          fileName: file.name,
          fileSize: file.size
        }),
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dosya Yükle</h1>
        <button
          onClick={() => {
            setShowHistory(!showHistory)
            if (!showHistory) loadImportHistory()
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {showHistory ? '✕ Kapat' : '📋 Yükleme Geçmişi'}
        </button>
      </div>

      {/* Upload History */}
      {showHistory && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Yükleme Geçmişi</h2>
            <button
              onClick={loadImportHistory}
              disabled={loadingHistory}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {loadingHistory ? '⏳ Yükleniyor...' : '🔄 Yenile'}
            </button>
          </div>

          {importHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Henüz import işlemi yapılmamış</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Dosya Adı</th>
                    <th className="text-center p-3">Toplam</th>
                    <th className="text-center p-3">Başarılı</th>
                    <th className="text-center p-3">Başarısız</th>
                    <th className="text-right p-3">Boyut</th>
                    <th className="text-left p-3">Tarih</th>
                    <th className="text-center p-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((history) => (
                    <tr key={history.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{history.file_name}</td>
                      <td className="p-3 text-center">{history.total_rows}</td>
                      <td className="p-3 text-center text-green-600 font-semibold">
                        {history.successful_imports}
                      </td>
                      <td className="p-3 text-center text-red-600 font-semibold">
                        {history.failed_imports}
                      </td>
                      <td className="p-3 text-right text-gray-600">
                        {formatFileSize(history.file_size)}
                      </td>
                      <td className="p-3 text-gray-600">
                        {formatDate(history.created_at)}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          {history.failed_imports > 0 && history.error_log && (
                            <button
                              onClick={() => {
                                alert(JSON.stringify(history.error_log, null, 2))
                              }}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Hata Logları
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteHistory(history.id, history.file_name)}
                            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                            title="Geçmişten Sil"
                          >
                            🗑️ Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4">Dosya Formatı (Excel veya CSV)</h2>
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-800">
            ℹ️ <strong>İpucu:</strong> Büyük dosyalarda ilerlemeyi takip etmek için tarayıcınızın geliştirici konsolunu açın (F12) ve Console sekmesine bakın.
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded text-sm">
          <p className="mb-2">Excel (.xlsx, .xls) veya CSV (.csv) dosyanız aşağıdaki sütunları içermelidir:</p>
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
          accept=".xlsx,.xls,.csv"
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
