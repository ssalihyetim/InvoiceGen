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

const getCurrencySymbol = (currency: string): string => {
  switch (currency) {
    case 'TL': return '₺'
    case 'USD': return '$'
    case 'EUR': return '€'
    default: return currency
  }
}

export const generateQuotationPDF = (
  companyInfo: CompanyInfo,
  items: QuotationItem[],
  quotationNumber: string
) => {
  const doc = new jsPDF()

  // Başlık
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('TEKLİF FORMU', 105, 20, { align: 'center' })

  // Teklif numarası ve tarih
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const today = new Date().toLocaleDateString('tr-TR')
  doc.text(`Teklif No: ${quotationNumber}`, 20, 35)
  doc.text(`Tarih: ${today}`, 20, 42)

  // Firma bilgileri
  doc.setFont('helvetica', 'bold')
  doc.text('Firma Bilgileri:', 20, 52)
  doc.setFont('helvetica', 'normal')
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
  doc.setFont('helvetica', 'bold')
  doc.text('ÜRÜNLER', 20, yPos)
  yPos += 7

  // Tablo başlıkları
  doc.setFontSize(9)
  doc.text('#', 15, yPos)
  doc.text('Ürün Kodu', 23, yPos)
  doc.text('Ürün Tipi', 60, yPos)
  doc.text('Miktar', 100, yPos)
  doc.text('Birim Fiyat', 120, yPos)
  doc.text('İskonto', 150, yPos)
  doc.text('Toplam', 170, yPos)
  doc.line(15, yPos + 2, 195, yPos + 2)
  yPos += 7

  // Satır satır ürünler
  doc.setFont('helvetica', 'normal')
  items.forEach((item, index) => {
    // Sayfa sonu kontrolü
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }

    const unitPrice = item.product.base_price
    const quantity = item.quantity
    const discount = item.discount_percentage
    const subtotal = unitPrice * quantity
    const discountAmount = subtotal * (discount / 100)
    const total = subtotal - discountAmount

    doc.text(`${index + 1}`, 15, yPos)
    doc.text(item.product.product_code, 23, yPos)

    // Ürün tipi (uzunsa kısalt)
    const productType = item.product.product_type.length > 20
      ? item.product.product_type.substring(0, 17) + '...'
      : item.product.product_type
    doc.text(productType, 60, yPos)

    doc.text(`${quantity} ${item.product.unit}`, 100, yPos)
    doc.text(`${unitPrice.toFixed(2)}${getCurrencySymbol(item.product.currency)}`, 120, yPos)
    doc.text(`%${discount}`, 150, yPos)
    doc.text(`${total.toFixed(2)}${getCurrencySymbol(item.product.currency)}`, 170, yPos)

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

  doc.setFont('helvetica', 'bold')
  doc.text('TOPLAM:', 140, yPos)
  doc.setFont('helvetica', 'normal')

  Object.entries(totalsByCurrency).forEach(([currency, amounts]) => {
    yPos += 6
    doc.text(`Ara Toplam (${currency}):`, 140, yPos)
    doc.text(`${amounts.total.toFixed(2)}${getCurrencySymbol(currency)}`, 175, yPos)

    if (amounts.discount > 0) {
      yPos += 6
      doc.text(`İskonto (${currency}):`, 140, yPos)
      doc.text(`-${amounts.discount.toFixed(2)}${getCurrencySymbol(currency)}`, 175, yPos)
    }

    yPos += 6
    doc.setFont('helvetica', 'bold')
    doc.text(`GENEL TOPLAM (${currency}):`, 140, yPos)
    doc.text(`${amounts.final.toFixed(2)}${getCurrencySymbol(currency)}`, 175, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')} | Sayfa ${i} / ${pageCount}`,
      105,
      290,
      { align: 'center' }
    )
  }

  // PDF'i indir
  doc.save(`Teklif_${quotationNumber}_${companyInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
