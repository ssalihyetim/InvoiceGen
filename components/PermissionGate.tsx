'use client'

import { useAuth } from '@/lib/auth-context'
import { canPerform, Resource, Action } from '@/lib/permissions'
import { ReactNode } from 'react'

interface PermissionGateProps {
  resource: Resource
  action: Action
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Conditionally renders children based on user's role permissions.
 * Usage: <PermissionGate resource="products" action="delete"><DeleteButton /></PermissionGate>
 */
export default function PermissionGate({ resource, action, children, fallback = null }: PermissionGateProps) {
  const { role } = useAuth()

  if (!canPerform(role, resource, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
