import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, applyToAll } = body

    if (!applyToAll && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: 'ids array required (or set applyToAll: true)' }, { status: 400 })
    }

    if (applyToAll) {
      // Null out FK references first to avoid constraint violation (uses service role to bypass RLS)
      const { error: analyticsErr } = await supabaseAdmin
        .from('match_analytics')
        .update({ matched_product_id: null })
        .not('matched_product_id', 'is', null)

      if (analyticsErr) {
        console.error('match_analytics nullify error (applyToAll):', analyticsErr)
      }

      const { error, count } = await supabaseAdmin
        .from('products')
        .delete({ count: 'exact' })
        .not('id', 'is', null)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ deleted: count || 0, errors: 0 })
    }

    // Null out FK references for these specific products (uses service role to bypass RLS)
    const { error: analyticsErr } = await supabaseAdmin
      .from('match_analytics')
      .update({ matched_product_id: null })
      .in('matched_product_id', ids)

    if (analyticsErr) {
      console.error('match_analytics nullify error:', analyticsErr)
    }

    const { error, count } = await supabaseAdmin
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
