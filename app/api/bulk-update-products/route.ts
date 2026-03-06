import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, updates, applyToAll } = body

    if (!applyToAll && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: 'ids array required (or set applyToAll: true)' }, { status: 400 })
    }

    const { currency, unit, price_multiplier } = updates
    const multiplier = price_multiplier ? parseFloat(price_multiplier) : 1.0

    const simpleUpdate: any = {}
    if (currency) simpleUpdate.currency = currency
    if (unit) simpleUpdate.unit = unit

    // applyToAll: simple fields without multiplier — single DB update
    if (applyToAll && Math.abs(multiplier - 1.0) < 0.0001) {
      if (Object.keys(simpleUpdate).length === 0) {
        return NextResponse.json({ success: 0, message: 'Değişiklik yok' })
      }
      const { error } = await (supabase as any)
        .from('products')
        .update(simpleUpdate)
        .not('id', 'is', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })
      return NextResponse.json({ success: count || 0 })
    }

    // Resolve ID list: either from client or fetch all from DB
    let targetIds: string[] = ids || []
    if (applyToAll) {
      const { data: allProducts } = await supabase.from('products').select('id')
      targetIds = allProducts?.map((p: any) => p.id) || []
    }

    // No multiplier: single batch update
    if (Math.abs(multiplier - 1.0) < 0.0001) {
      if (Object.keys(simpleUpdate).length === 0) {
        return NextResponse.json({ success: 0, message: 'Değişiklik yok' })
      }
      const { error } = await supabase.from('products').update(simpleUpdate).in('id', targetIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: targetIds.length })
    }

    // Price multiplier: fetch → compute → upsert in server-side batches of 500
    const BATCH_SIZE = 500
    let successCount = 0

    for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
      const batchIds = targetIds.slice(i, i + BATCH_SIZE)

      const { data: products } = await supabase
        .from('products')
        .select('id, base_price')
        .in('id', batchIds)

      if (!products) continue

      const upsertRows = products.map((p: any) => ({
        id: p.id,
        base_price: p.base_price * multiplier,
        ...simpleUpdate,
      }))

      const { error } = await (supabase as any)
        .from('products')
        .upsert(upsertRows, { onConflict: 'id' })

      if (!error) successCount += upsertRows.length
    }

    return NextResponse.json({ success: successCount })
  } catch (error: any) {
    console.error('bulk-update-products error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
