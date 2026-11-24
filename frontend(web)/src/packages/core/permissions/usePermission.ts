import { useAuth } from '@/features/auth/useAuth'
import { hasPermission, type Permission } from './matrix'

export function usePermission(permission: Permission): boolean {
  const { user } = useAuth()
  if (!user) return false
  return hasPermission(user.role, permission)
}
