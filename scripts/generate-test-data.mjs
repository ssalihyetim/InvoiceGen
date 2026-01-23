import ExcelJS from 'exceljs'

// 30 ürünlük örnek veri
const products = [
  { tip: 'Boru', cap: '1/2"', kod: 'BR-001', fiyat: 125.50, birim: 'metre', aciklama: 'PVC Boru 1/2 inç' },
  { tip: 'Boru', cap: '3/4"', kod: 'BR-002', fiyat: 185.75, birim: 'metre', aciklama: 'PVC Boru 3/4 inç' },
  { tip: 'Boru', cap: '1"', kod: 'BR-003', fiyat: 245.00, birim: 'metre', aciklama: 'PVC Boru 1 inç' },
  { tip: 'Boru', cap: '1.5"', kod: 'BR-004', fiyat: 325.50, birim: 'metre', aciklama: 'PVC Boru 1.5 inç' },
  { tip: 'Boru', cap: '2"', kod: 'BR-005', fiyat: 425.00, birim: 'metre', aciklama: 'PVC Boru 2 inç' },

  { tip: 'Vana', cap: '1/2"', kod: 'VN-001', fiyat: 85.50, birim: 'adet', aciklama: 'Küresel Vana 1/2"' },
  { tip: 'Vana', cap: '3/4"', kod: 'VN-002', fiyat: 125.00, birim: 'adet', aciklama: 'Küresel Vana 3/4"' },
  { tip: 'Vana', cap: '1"', kod: 'VN-003', fiyat: 165.75, birim: 'adet', aciklama: 'Küresel Vana 1"' },
  { tip: 'Vana', cap: '1.5"', kod: 'VN-004', fiyat: 245.00, birim: 'adet', aciklama: 'Küresel Vana 1.5"' },
  { tip: 'Vana', cap: '2"', kod: 'VN-005', fiyat: 325.50, birim: 'adet', aciklama: 'Küresel Vana 2"' },

  { tip: 'Dirsek', cap: '1/2"', kod: 'DR-001', fiyat: 12.50, birim: 'adet', aciklama: '90° Dirsek 1/2"' },
  { tip: 'Dirsek', cap: '3/4"', kod: 'DR-002', fiyat: 18.75, birim: 'adet', aciklama: '90° Dirsek 3/4"' },
  { tip: 'Dirsek', cap: '1"', kod: 'DR-003', fiyat: 24.50, birim: 'adet', aciklama: '90° Dirsek 1"' },
  { tip: 'Dirsek', cap: '1.5"', kod: 'DR-004', fiyat: 35.00, birim: 'adet', aciklama: '90° Dirsek 1.5"' },
  { tip: 'Dirsek', cap: '2"', kod: 'DR-005', fiyat: 45.50, birim: 'adet', aciklama: '90° Dirsek 2"' },

  { tip: 'Te', cap: '1/2"', kod: 'TE-001', fiyat: 15.50, birim: 'adet', aciklama: 'T Bağlantı 1/2"' },
  { tip: 'Te', cap: '3/4"', kod: 'TE-002', fiyat: 22.75, birim: 'adet', aciklama: 'T Bağlantı 3/4"' },
  { tip: 'Te', cap: '1"', kod: 'TE-003', fiyat: 29.50, birim: 'adet', aciklama: 'T Bağlantı 1"' },
  { tip: 'Te', cap: '1.5"', kod: 'TE-004', fiyat: 42.00, birim: 'adet', aciklama: 'T Bağlantı 1.5"' },
  { tip: 'Te', cap: '2"', kod: 'TE-005', fiyat: 55.50, birim: 'adet', aciklama: 'T Bağlantı 2"' },

  { tip: 'Manşon', cap: '1/2"', kod: 'MN-001', fiyat: 8.50, birim: 'adet', aciklama: 'Manşon 1/2"' },
  { tip: 'Manşon', cap: '3/4"', kod: 'MN-002', fiyat: 12.75, birim: 'adet', aciklama: 'Manşon 3/4"' },
  { tip: 'Manşon', cap: '1"', kod: 'MN-003', fiyat: 16.50, birim: 'adet', aciklama: 'Manşon 1"' },
  { tip: 'Manşon', cap: '1.5"', kod: 'MN-004', fiyat: 24.00, birim: 'adet', aciklama: 'Manşon 1.5"' },
  { tip: 'Manşon', cap: '2"', kod: 'MN-005', fiyat: 32.50, birim: 'adet', aciklama: 'Manşon 2"' },

  { tip: 'Rekor', cap: '1/2"', kod: 'RK-001', fiyat: 18.50, birim: 'adet', aciklama: 'Rekor Bağlantı 1/2"' },
  { tip: 'Rekor', cap: '3/4"', kod: 'RK-002', fiyat: 26.75, birim: 'adet', aciklama: 'Rekor Bağlantı 3/4"' },
  { tip: 'Rekor', cap: '1"', kod: 'RK-003', fiyat: 34.50, birim: 'adet', aciklama: 'Rekor Bağlantı 1"' },
  { tip: 'Rekor', cap: '1.5"', kod: 'RK-004', fiyat: 48.00, birim: 'adet', aciklama: 'Rekor Bağlantı 1.5"' },
  { tip: 'Rekor', cap: '2"', kod: 'RK-005', fiyat: 62.50, birim: 'adet', aciklama: 'Rekor Bağlantı 2"' },
]

// Excel dosyası oluştur
const workbook = new ExcelJS.Workbook()
const worksheet = workbook.addWorksheet('Ürünler')

// Başlıkları ekle
worksheet.columns = [
  { header: 'Ürün Tipi', key: 'tip', width: 15 },
  { header: 'Çap', key: 'cap', width: 10 },
  { header: 'Ürün Kodu', key: 'kod', width: 12 },
  { header: 'Birim Fiyat', key: 'fiyat', width: 12 },
  { header: 'Birim', key: 'birim', width: 10 },
  { header: 'Açıklama', key: 'aciklama', width: 30 },
]

// Başlık satırını stillendir
worksheet.getRow(1).font = { bold: true }
worksheet.getRow(1).fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD3D3D3' }
}

// Verileri ekle
products.forEach(product => {
  worksheet.addRow(product)
})

// Dosyayı kaydet
await workbook.xlsx.writeFile('urunler_ornegi.xlsx')

console.log('✓ urunler_ornegi.xlsx oluşturuldu (30 ürün)')

// 5 ürünlük teklif talebi dosyası
const quotationWorkbook = new ExcelJS.Workbook()
const quotationWorksheet = quotationWorkbook.addWorksheet('Teklif Talebi')

quotationWorksheet.columns = [
  { header: 'Müşteri Talebi', key: 'talep', width: 50 },
  { header: 'Miktar', key: 'miktar', width: 10 },
]

quotationWorksheet.getRow(1).font = { bold: true }
quotationWorksheet.getRow(1).fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFD700' }
}

const requests = [
  { talep: '1/2 inç plastik boru 50 metre', miktar: 50 },
  { talep: 'Bir inçlik küresel vana 12 adet', miktar: 12 },
  { talep: '3/4 inç 90 derece dirsek 25 tane', miktar: 25 },
  { talep: 'İki inç T bağlantı 8 adet', miktar: 8 },
  { talep: '1.5 inçlik manşon 30 adet gerekiyor', miktar: 30 },
]

requests.forEach(request => {
  quotationWorksheet.addRow(request)
})

await quotationWorkbook.xlsx.writeFile('teklif_talepleri.xlsx')

console.log('✓ teklif_talepleri.xlsx oluşturuldu (5 teklif talebi)')
console.log('\nDosyalar proje klasöründe oluşturuldu!')
