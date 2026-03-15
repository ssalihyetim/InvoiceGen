import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { canPerform, Resource, Action, Role } from './permissions'

interface AuthResult {
  user: { id: string; email?: string }
  tenantId: string
  role: Role
}

/**
 * Server-side auth check for API routes.
 * Returns user info with tenant/role or an error response.
 */
export async function getAuthContext(request: NextRequest): Promise<AuthResult | NextResponse> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // API routes don't set cookies
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant_user record
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!tenantUser) {
    return NextResponse.json({ error: 'No tenant association found' }, { status: 403 })
  }

  return {
    user: { id: user.id, email: user.email },
    tenantId: tenantUser.tenant_id,
    role: tenantUser.role as Role,
  }
}

/**
 * Check if the authenticated user can perform an action.
 * Returns null if allowed, or an error response if denied.
 */
export function requirePermission(
  auth: AuthResult,
  resource: Resource,
  action: Action
): NextResponse | null {
  if (!canPerform(auth.role, resource, action)) {
    return NextResponse.json(
      { error: `Bu işlem için yetkiniz yok (${resource}:${action})` },
      { status: 403 }
    )
  }
  return null
}
