import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import { isRoleAllowed, type StaffRole } from './matrix'

export interface RequireRoleProps {
  roles: readonly (StaffRole | string)[]
  children?: ReactNode
  redirectTo?: string
}

/**
 * Route guard / element wrapper that ensures only users with allowed roles can access.
 * Unauthenticated users are redirected to /login, unauthorized to /forbidden.
 */
export function RequireRole({ roles, children, redirectTo = '/forbidden' }: RequireRoleProps) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isRoleAllowed(user.role, roles)) {
    return <Navigate to={redirectTo} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default RequireRole
