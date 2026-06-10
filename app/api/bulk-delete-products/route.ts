import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requirePermission } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (auth instanceof NextResponse) return auth

  const denied = requirePermission(auth, 'products', 'delete')
  if (denied) return denied

  const { supabase, tenantId } = auth

  try {
    const body = await request.json()
    const { ids, applyToAll } = body

    if (!applyToAll && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: 'ids array required (or set applyToAll: true)' }, { status: 400 })
    }

    if (applyToAll) {
      // Tenant filter is defense-in-depth on top of RLS — applyToAll must
      // never reach beyond the caller's own tenant.
      const { error, count } = await supabase
        .from('products')
        .delete({ count: 'exact' })
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('bulk-delete-products (applyToAll) error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ deleted: count || 0, errors: 0 })
    }

    const { error, count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .eq('tenant_id', tenantId)
      .in('id', ids)

    if (error) {
      console.error('bulk-delete-products error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ deleted: count || 0, errors: 0 })
  } catch (error: any) {
    console.error('bulk-delete-products error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
