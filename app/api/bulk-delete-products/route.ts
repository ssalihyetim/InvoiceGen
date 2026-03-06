import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, applyToAll } = body

    if (!applyToAll && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: 'ids array required (or set applyToAll: true)' }, { status: 400 })
    }

    // Resolve ID list
    let targetIds: string[] = ids || []
    if (applyToAll) {
      const { data: allProducts } = await supabase.from('products').select('id')
      targetIds = allProducts?.map((p: any) => p.id) || []
    }

    const BATCH_SIZE = 100
    let deleted = 0
    let errors = 0

    for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
      const batch = targetIds.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('products').delete().in('id', batch)
      if (error) {
        errors += batch.length
      } else {
        deleted += batch.length
      }
    }

    return NextResponse.json({ deleted, errors })
  } catch (error: any) {
    console.error('bulk-delete-products error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
