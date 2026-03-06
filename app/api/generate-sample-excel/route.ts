import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // Fetch up to 15 random products
    const { data: products, error } = await supabase
      .from('products')
      .select('product_code, product_type, diameter')
      .limit(15)

    if (error) throw error

    const rows = (products || []).map((p, i) => ({
      'Müşteri Talebi': p.product_code || p.product_type || `Ürün ${i + 1}`,
      'Miktar': Math.floor(Math.random() * 10) + 1,
    }))

    if (rows.length === 0) {
      // Fallback sample if DB is empty
      rows.push(
        { 'Müşteri Talebi': 'NTG EF 63-50', 'Miktar': 2 },
        { 'Müşteri Talebi': 'Boru 1/2 inç galvanizli', 'Miktar': 10 },
        { 'Müşteri Talebi': 'Küresel Vana DN25', 'Miktar': 5 },
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
