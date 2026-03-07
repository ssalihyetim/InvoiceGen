import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('product_code, product_type, unit')
      .limit(15)

    if (error) throw error

    const rows = (products || []).map((p, i) => ({
      'Ürün Kodu': p.product_code || `URUN-${i + 1}`,
      'Ürün Adı': p.product_type || '',
      'Miktar': Math.floor(Math.random() * 10) + 1,
      'Birim': p.unit || 'Adet',
    }))

    if (rows.length === 0) {
      rows.push(
        { 'Ürün Kodu': 'NTG EF 63-50', 'Ürün Adı': 'Nipel Galvaniz Erkek-Erkek', 'Miktar': 2, 'Birim': 'Adet' },
        { 'Ürün Kodu': 'BRU-12-GALV', 'Ürün Adı': 'Boru 1/2 inç galvanizli', 'Miktar': 10, 'Birim': 'Metre' },
        { 'Ürün Kodu': 'KRV-DN25', 'Ürün Adı': 'Küresel Vana DN25', 'Miktar': 5, 'Birim': 'Adet' },
      )
    }

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Teklif')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ornek-teklif.xlsx"',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
