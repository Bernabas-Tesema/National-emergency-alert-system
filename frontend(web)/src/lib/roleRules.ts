import type { OrganizationKind } from '@/types/admin'
import { STAFF_ROLES, canonicalRole, hasWebAccess, type Role } from '@/types/role'

/** Roles INSA Super Admin / Administrator can assign in Staff Accounts. */
export const ASSIGNABLE_ROLES: Role[] = [...STAFF_ROLES]

const EXTERNAL_CANONICAL = new Set(['ORG_ADMIN', 'ORG_OFFICER'])

/** Outside-agency roles belong to partner orgs; INSA roles belong to INSA. */
export function organizationFitsRole(kind: OrganizationKind, role: Role): boolean {
  if (!hasWebAccess(role)) return false
  const norm = canonicalRole(role)
  if (!norm || norm === 'CITIZEN') return false
  const external = EXTERNAL_CANONICAL.has(norm)
  return external ? kind !== 'insa' : kind === 'insa'
}
