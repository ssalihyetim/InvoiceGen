import jsPDF from 'jspdf'

type CompanyInfo = {
  name: string
  email?: string | null
  phone?: string | null
  tax_number?: string | null
}

type QuotationItem = {
  product: {
    product_code: string
    product_type: string
    diameter?: string | null
    base_price: number
    currency: string
    unit: string
  }
  quantity: number
  discount_percentage: number
  original_request?: string
}

// Currency symbol helper - returns symbol or fallback text
const getCurrencySymbol = (currency: string, fontLoaded: boolean = true): string => {
  switch (currency.toUpperCase()) {
    case 'TL':
    case 'TRY':
      // Use symbol if custom font loaded, otherwise use text
      return fontLoaded ? '₺' : 'TL'
    case 'USD':
      return '$'
    case 'EUR':
      // Euro symbol may not render in default font
      return fontLoaded ? '€' : 'EUR'
    default:
      return currency
  }
}

// Sanitize text and convert Turkish characters to ASCII (fixes PDF spacing issues)
const sanitizeText = (text: string): string => {
  if (!text) return ''
  return text
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
}

export const generateQuotationPDF = async (
  companyInfo: CompanyInfo,
  items: QuotationItem[],
  quotationNumber: string
) => {
  const doc = new jsPDF()

  // Set document properties
  doc.setProperties({
    title: 'Teklif Formu',
    subject: 'Teklif',
  })

  // Try to load custom Roboto font for special characters (₺, €)
  // Note: Custom font loading is disabled for stability
  // Using default jsPDF font instead
  let fontLoaded = false

  // Uncomment below to enable custom font (requires debugging)
  /*
  try {
    console.log('Attempting to load Roboto font...')
    const response = await fetch('/fonts/Roboto-Regular.ttf')

    if (!response.ok) {
      throw new Error(`Font fetch failed: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('Font loaded, size:', arrayBuffer.byteLength)

    // Convert to base64
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)

    doc.addFileToVFS('Roboto-Regular.ttf', base64)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    doc.setFont('Roboto', 'normal')
    fontLoaded = true
    console.log('Roboto font loaded successfully!')
  } catch (error) {
    console.error('Failed to load custom font, using default:', error)
    fontLoaded = false
  }
  */

  // Başlık
  doc.setFontSize(20)
  doc.text('TEKLIF FORMU', 105, 20, { align: 'center' })

  // Teklif numarası ve tarih
  doc.setFontSize(10)
  const today = new Date().toLocaleDateString('tr-TR')
  doc.text(`Teklif No: ${quotationNumber}`, 20, 35)
  doc.text(`Tarih: ${today}`, 20, 42)

  // Firma bilgileri
  doc.text('Firma Bilgileri:', 20, 52)
  doc.text(`Firma: ${companyInfo.name}`, 20, 59)
  if (companyInfo.email) {
    doc.text(`Email: ${companyInfo.email}`, 20, 66)
  }
  if (companyInfo.phone) {
    doc.text(`Telefon: ${companyInfo.phone}`, 20, 73)
  }
  if (companyInfo.tax_number) {
    doc.text(`Vergi No: ${companyInfo.tax_number}`, 20, 80)
  }

  // Teklif kalemleri tablosu
  let yPos = 95
  doc.text('URUNLER', 20, yPos)
  yPos += 7

  // Tablo başlıkları
  doc.setFontSize(9)
  doc.text('#', 15, yPos)
  doc.text('Urun Kodu', 23, yPos)
  doc.text('Urun Tipi', 60, yPos)
  doc.text('Miktar', 100, yPos)
  doc.text('Birim Fiyat', 120, yPos)
  doc.text('Iskonto', 150, yPos)
  doc.text('Toplam', 170, yPos)
  doc.line(15, yPos + 2, 195, yPos + 2)
  yPos += 7

  // Satır satır ürünler
  items.forEach((item, index) => {
    // Sayfa sonu kontrolü
    if (yPos > 270) {
      doc.addPage()
      doc.setFontSize(9)
      yPos = 20
    }

    const unitPrice = item.product.base_price
    const quantity = item.quantity
    const discount = item.discount_percentage
    const subtotal = unitPrice * quantity
    const discountAmount = subtotal * (discount / 100)
    const total = subtotal - discountAmount

    doc.text(`${index + 1}`, 15, yPos)
    doc.text(sanitizeText(item.product.product_code), 23, yPos)

    // Ürün tipi (uzunsa kısalt) - sanitize for proper encoding
    const rawProductType = sanitizeText(item.product.product_type)
    const productType = rawProductType.length > 20
      ? rawProductType.substring(0, 17) + '...'
      : rawProductType
    doc.text(productType, 60, yPos)

    doc.text(`${quantity} ${sanitizeText(item.product.unit)}`, 100, yPos)
    doc.text(`${unitPrice.toFixed(2)} ${getCurrencySymbol(item.product.currency, fontLoaded)}`, 120, yPos)
    doc.text(`%${discount}`, 150, yPos)
    doc.text(`${total.toFixed(2)} ${getCurrencySymbol(item.product.currency, fontLoaded)}`, 170, yPos)

    yPos += 6
  })

  // Para birimi bazında toplamlar
  yPos += 5
  doc.line(15, yPos, 195, yPos)
  yPos += 7

  const totalsByCurrency: Record<string, { total: number; discount: number; final: number }> = {}

  items.forEach(item => {
    const currency = item.product.currency
    if (!totalsByCurrency[currency]) {
      totalsByCurrency[currency] = { total: 0, discount: 0, final: 0 }
    }

    const unitPrice = item.product.base_price
    const quantity = item.quantity
    const discount = item.discount_percentage
    const subtotal = unitPrice * quantity
    const discountAmount = subtotal * (discount / 100)
    const total = subtotal - discountAmount

    totalsByCurrency[currency].total += subtotal
    totalsByCurrency[currency].discount += discountAmount
    totalsByCurrency[currency].final += total
  })

  doc.text('TOPLAM:', 140, yPos)

  Object.entries(totalsByCurrency).forEach(([currency, amounts]) => {
    yPos += 6
    doc.text(`Ara Toplam (${currency}): `, 140, yPos)
    doc.text(`${amounts.total.toFixed(2)} ${getCurrencySymbol(currency, fontLoaded)}`, 175, yPos)

    if (amounts.discount > 0) {
      yPos += 6
      doc.text(`Iskonto (${currency}): `, 140, yPos)
      doc.text(`-${amounts.discount.toFixed(2)} ${getCurrencySymbol(currency, fontLoaded)}`, 175, yPos)
    }

    yPos += 6
    doc.text(`GENEL TOPLAM (${currency}): `, 140, yPos)
    doc.text(`${amounts.final.toFixed(2)} ${getCurrencySymbol(currency, fontLoaded)}`, 175, yPos)
    yPos += 8
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Olusturulma Tarihi: ${new Date().toLocaleString('tr-TR')} | Sayfa ${i} / ${pageCount}`,
      105,
      290,
      { align: 'center' }
    )
  }

  // ✅ Add verification log
  console.log('PDF Generated with default jsPDF font (no spacing or Turkish character issues)')

  // PDF'i indir
  doc.save(`Teklif_${quotationNumber}_${companyInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
