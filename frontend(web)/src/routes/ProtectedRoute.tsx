import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import type { Role } from '@/types/role'

export default function ProtectedRoute({
  allowedRoles,
}: {
  allowedRoles: Role[]
}) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }
  return <Outlet />
}