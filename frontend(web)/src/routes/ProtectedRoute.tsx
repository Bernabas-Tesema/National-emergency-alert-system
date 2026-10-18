import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import { isRoleAllowed } from '@/packages/core/permissions/matrix'
import type { Role } from '@/types/role'

export default function ProtectedRoute({
  allowedRoles,
}: {
  allowedRoles: Role[]
}) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (!isRoleAllowed(user.role, allowedRoles)) {
    return <Navigate to="/forbidden" replace />
  }
  return <Outlet />
}