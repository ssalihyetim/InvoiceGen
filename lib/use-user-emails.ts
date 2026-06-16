'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from './supabase-browser'

// Resolves audit-log actor user_id -> email via the tenant-scoped SECURITY DEFINER RPC
// (get_tenant_user_emails). Loaded once; returns a map { user_id: email }.
export function useUserEmails(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase
      .rpc('get_tenant_user_emails')
      .then(({ data }) => {
        if (!data) return
        const m: Record<string, string> = {}
        for (const row of data as { id: string; email: string }[]) {
          if (row.id) m[row.id] = row.email
        }
        setMap(m)
      })
  }, [])

  return map
}
