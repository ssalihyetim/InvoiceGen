import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, applyToAll } = body

    if (!applyToAll && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: 'ids array required (or set applyToAll: true)' }, { status: 400 })
    }

    if (applyToAll) {
      // Null out FK references first to avoid constraint violation
      await supabase.from('match_analytics').update({ matched_product_id: null }).not('matched_product_id', 'is', null)

      const { error, count } = await supabase
        .from('products')
        .delete({ count: 'exact' })
        .not('id', 'is', null)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ deleted: count || 0, errors: 0 })
    }

    // Null out FK references for these specific products
    await supabase.from('match_analytics').update({ matched_product_id: null }).in('matched_product_id', ids)

    const { error, count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: count || 0, errors: 0 })
  } catch (error: any) {
    console.error('bulk-delete-products error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
