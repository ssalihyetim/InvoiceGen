'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createSupabaseBrowserClient } from './supabase-browser'
import type { User } from '@supabase/supabase-js'

type Role = 'admin' | 'manager' | 'sales' | 'accountant' | 'viewer'

interface AuthContextType {
  user: User | null
  role: Role | null
  tenantId: string | null
  tenantName: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  tenantId: null,
  tenantName: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    async function loadSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Get tenant_user record with tenant info
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id, role, tenants:tenant_id(name)')
            .eq('user_id', user.id)
            .limit(1)
            .single()

          if (tenantUser) {
            setTenantId(tenantUser.tenant_id)
            setRole(tenantUser.role as Role)
            // tenants is joined as object
            const tenant = tenantUser.tenants as any
            setTenantName(tenant?.name || null)
          }
        }
      } catch (error) {
        console.error('Auth context error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setRole(null)
        setTenantId(null)
        setTenantName(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    setTenantId(null)
    setTenantName(null)
  }

  return (
    <AuthContext.Provider value={{ user, role, tenantId, tenantName, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
