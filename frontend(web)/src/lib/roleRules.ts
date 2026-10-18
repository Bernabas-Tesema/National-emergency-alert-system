import type { OrganizationKind } from '@/types/admin'
import { hasWebAccess, type Role } from '@/types/role'

// Roles an admin can give to a person: every role that uses the web app.
export const ASSIGNABLE_ROLES: Role[] = [
  'provider',
  'org_admin',
  'dispatcher',
  'higher_officer',
  'auditor',
  'system_admin',
]

const EXTERNAL_ROLES: Role[] = ['provider', 'org_admin']

// Outside-agency roles belong to outside agencies, and INSA roles to INSA.
export function organizationFitsRole(
  kind: OrganizationKind,
  role: Role,
): boolean {
  if (!hasWebAccess(role)) return false
  return EXTERNAL_ROLES.includes(role) ? kind !== 'insa' : kind === 'insa'
}