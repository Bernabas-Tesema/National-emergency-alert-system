import type { ReactNode } from 'react'
import { usePermission } from './usePermission'
import type { Permission } from './matrix'

export interface CanProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Conditionally renders children if the authenticated user has the specified permission.
 * Users will never see UI they cannot use.
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = usePermission(permission)
  return allowed ? <>{children}</> : <>{fallback}</>
}
