// ============================================
// FAZ 2: Role-Based Access Control
// ============================================

export type Role = 'admin' | 'manager' | 'sales' | 'accountant' | 'viewer'

export type Resource = 'products' | 'companies' | 'quotations' | 'reports' | 'admin' | 'settings'

export type Action = 'create' | 'read' | 'update' | 'delete'

// Permission matrix: role → resource → allowed actions
const PERMISSION_MATRIX: Record<Role, Record<Resource, Action[]>> = {
  admin: {
    products: ['create', 'read', 'update', 'delete'],
    companies: ['create', 'read', 'update', 'delete'],
    quotations: ['create', 'read', 'update', 'delete'],
    reports: ['read'],
    admin: ['create', 'read', 'update', 'delete'],
    settings: ['create', 'read', 'update', 'delete'],
  },
  manager: {
    products: ['create', 'read', 'update', 'delete'],
    companies: ['create', 'read', 'update', 'delete'],
    quotations: ['create', 'read', 'update', 'delete'],
    reports: ['read'],
    admin: [],
    settings: ['read'],
  },
  sales: {
    products: ['read'],
    companies: ['read'],
    quotations: ['create', 'read', 'update'], // own only (enforced by RLS)
    reports: ['read'], // own only
    admin: [],
    settings: [],
  },
  accountant: {
    products: ['read'],
    companies: ['read'],
    quotations: ['read'],
    reports: ['read'],
    admin: [],
    settings: [],
  },
  viewer: {
    products: ['read'],
    companies: ['read'],
    quotations: ['read'],
    reports: [],
    admin: [],
    settings: [],
  },
}

/**
 * Check if a role can perform an action on a resource
 */
export function canPerform(role: Role | null, resource: Resource, action: Action): boolean {
  if (!role) return false
  return PERMISSION_MATRIX[role]?.[resource]?.includes(action) ?? false
}

/**
 * Get all allowed actions for a role on a resource
 */
export function getAllowedActions(role: Role | null, resource: Resource): Action[] {
  if (!role) return []
  return PERMISSION_MATRIX[role]?.[resource] ?? []
}

/**
 * Check if role is admin-level (admin or manager)
 */
export function isAdminLevel(role: Role | null): boolean {
  return role === 'admin' || role === 'manager'
}

/**
 * Role display names in Turkish
 */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  sales: 'Satış',
  accountant: 'Muhasebe',
  viewer: 'İzleyici',
}

/**
 * Role colors for badges
 */
export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-purple-100 text-purple-800',
  sales: 'bg-blue-100 text-blue-800',
  accountant: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
}
