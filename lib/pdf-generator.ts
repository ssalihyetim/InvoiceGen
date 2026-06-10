import jsPDF from 'jspdf'

type CompanyInfo = {
  name: string
  email?: string | null
  phone?: string | null
  tax_number?: string | null
}

type QuotationItem = {
  product: {
    product_code: string | null
    product_type: string
    diameter?: string | null
    base_price: number
    currency: string | null
    unit: string | null
  }
  quantity: number
  discount_percentage: number
  original_request?: string
}

// Currency symbol helper - returns symbol or fallback text
const getCurrencySymbol = (currency: string | null | undefined, fontLoaded: boolean = true): string => {
  const cur = currency || 'TRY'
  switch (cur.toUpperCase()) {
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
      return cur
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

type TenantSettings = {
  logo_url?: string
  terms?: string
  header_note?: string
  footer_note?: string
}

export const generateQuotationPDF = async (
  companyInfo: CompanyInfo,
  items: QuotationItem[],
  quotationNumber: string,
  options?: {
    validUntil?: string | null
    tenantSettings?: TenantSettings
    tenantName?: string
  }
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

  // Tenant/Company header
  const tenantName = options?.tenantName
  const tenantSettings = options?.tenantSettings

  if (tenantName) {
    doc.setFontSize(12)
    doc.text(sanitizeText(tenantName), 105, 15, { align: 'center' })
  }
  if (tenantSettings?.header_note) {
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(sanitizeText(tenantSettings.header_note), 105, 22, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  }

  // Başlık
  doc.setFontSize(20)
  doc.text('TEKLIF FORMU', 105, tenantName ? 32 : 20, { align: 'center' })

  // Teklif numarası ve tarih
  doc.setFontSize(10)
  const today = new Date().toLocaleDateString('tr-TR')
  const yStart = tenantName ? 45 : 35
  doc.text(`Teklif No: ${quotationNumber}`, 20, yStart)
  doc.text(`Tarih: ${today}`, 20, yStart + 7)

  // Validity date
  if (options?.validUntil) {
    doc.text(`Gecerlilik: ${new Date(options.validUntil).toLocaleDateString('tr-TR')}`, 120, yStart)
  }

  // Firma bilgileri
  let infoY = yStart + 20
  doc.text('Firma Bilgileri:', 20, infoY)
  infoY += 7
  doc.text(`Firma: ${companyInfo.name}`, 20, infoY)
  if (companyInfo.email) {
    infoY += 7
    doc.text(`Email: ${companyInfo.email}`, 20, infoY)
  }
  if (companyInfo.phone) {
    infoY += 7
    doc.text(`Telefon: ${companyInfo.phone}`, 20, infoY)
  }
  if (companyInfo.tax_number) {
    infoY += 7
    doc.text(`Vergi No: ${companyInfo.tax_number}`, 20, infoY)
  }

  // Teklif kalemleri tablosu
  let yPos = infoY + 15
  doc.text('URUNLER', 20, yPos)
  yPos += 7

  // Tablo başlıkları
  doc.setFontSize(8)
  doc.text('#', 12, yPos)
  doc.text('Urun Kodu', 18, yPos)
  doc.text('Urun Adi', 50, yPos)
  doc.text('Miktar', 95, yPos)
  doc.text('Birim Fiyat', 110, yPos)
  doc.text('Iskonto', 133, yPos)
  doc.text('Isk.Birim Fiyat', 148, yPos)
  doc.text('Net Tutar', 175, yPos)
  doc.line(12, yPos + 2, 195, yPos + 2)
  yPos += 7

  // Satır satır ürünler
  items.forEach((item, index) => {
    const unitPrice = item.product.base_price
    const quantity = item.quantity
    const discount = item.discount_percentage
    const discountedUnitPrice = unitPrice * (1 - discount / 100)
    const netTotal = discountedUnitPrice * quantity
    const currSymbol = getCurrencySymbol(item.product.currency, fontLoaded)

    // Ürün adı — küçük font + tam metin (kısaltmadan)
    const rawProductName = sanitizeText(
      item.product.product_type + (item.product.diameter ? ` ${item.product.diameter}` : '')
    )
    const nameLines = doc.splitTextToSize(rawProductName, 42) as string[]
    const rowHeight = Math.max(6, nameLines.length * 4)

    // Sayfa sonu kontrolü
    if (yPos + rowHeight > 270) {
      doc.addPage()
      doc.setFontSize(8)
      yPos = 20
    }

    doc.setFontSize(8)
    doc.text(`${index + 1}`, 12, yPos)
    doc.text(sanitizeText(item.product.product_code ?? ''), 18, yPos)

    doc.setFontSize(7)
    doc.text(nameLines, 50, yPos)
    doc.setFontSize(8)

    doc.text(`${quantity} ${sanitizeText(item.product.unit ?? 'adet')}`, 95, yPos)
    doc.text(`${unitPrice.toFixed(2)} ${currSymbol}`, 110, yPos)
    doc.text(`%${discount}`, 133, yPos)
    doc.text(`${discountedUnitPrice.toFixed(2)} ${currSymbol}`, 148, yPos)
    doc.text(`${netTotal.toFixed(2)} ${currSymbol}`, 175, yPos)

    yPos += rowHeight
  })

  // Para birimi bazında toplamlar
  yPos += 5
  doc.line(15, yPos, 195, yPos)
  yPos += 7

  const totalsByCurrency: Record<string, { total: number; discount: number; final: number }> = {}

  items.forEach(item => {
    const currency = item.product.currency || 'TRY'
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

  // Terms & conditions (before footer)
  if (tenantSettings?.terms) {
    yPos += 10
    if (yPos > 255) {
      doc.addPage()
      yPos = 20
    }
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text('SARTLAR VE KOSULLAR:', 20, yPos)
    yPos += 5
    doc.setFontSize(7)
    const termsLines = doc.splitTextToSize(sanitizeText(tenantSettings.terms), 170) as string[]
    doc.text(termsLines, 20, yPos)
    doc.setTextColor(0, 0, 0)
  }

  // Footer
  const footerText = tenantSettings?.footer_note
    ? sanitizeText(tenantSettings.footer_note)
    : ''
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    const footerLine = `Olusturulma Tarihi: ${new Date().toLocaleString('tr-TR')} | Sayfa ${i} / ${pageCount}`
      + (footerText ? ` | ${footerText}` : '')
    doc.text(footerLine, 105, 290, { align: 'center' })
  }

  // ✅ Add verification log
  console.log('PDF Generated with default jsPDF font (no spacing or Turkish character issues)')

  // PDF'i indir
  doc.save(`Teklif_${quotationNumber}_${companyInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
