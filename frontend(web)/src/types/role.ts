import {
  STAFF_ROLES,
  hasWebAccess as matrixHasWebAccess,
  canonicalRole,
  type StaffRole,
} from '@/packages/core/permissions/matrix'

export { STAFF_ROLES, type StaffRole, canonicalRole }

// Supported role identifiers (including legacy lowercase aliases)
export const ROLES = [
  'citizen',
  'provider',
  'org_admin',
  'dispatcher',
  'higher_officer',
  'auditor',
  'system_admin',
  'SUPER_ADMIN',
  'ADMINISTRATOR',
  'HIGHER_OFFICER',
  'DISPATCHER',
  'AUDITOR',
  'ORG_ADMIN',
  'ORG_OFFICER',
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  citizen: 'Citizen',
  provider: 'Provider / Organization Officer',
  org_admin: 'Organization Administrator',
  dispatcher: 'Emergency Dispatcher',
  higher_officer: 'Higher Officer',
  auditor: 'Auditor',
  system_admin: 'System Administrator',
  SUPER_ADMIN: 'Super Administrator (INSA)',
  ADMINISTRATOR: 'Administrator (INSA)',
  HIGHER_OFFICER: 'Higher Officer',
  DISPATCHER: 'Emergency Dispatcher',
  AUDITOR: 'Auditor',
  ORG_ADMIN: 'Organization Administrator',
  ORG_OFFICER: 'Organization Officer',
}

export const ROLE_HOME_PATH: Record<Role, string | null> = {
  citizen: null,
  provider: '/resource/dashboard',
  org_admin: '/resource/dashboard',
  dispatcher: '/insa/sos',
  higher_officer: '/insa/approvals',
  auditor: '/insa/audit',
  system_admin: '/insa/dashboard',
  SUPER_ADMIN: '/insa/dashboard',
  ADMINISTRATOR: '/insa/dashboard',
  HIGHER_OFFICER: '/insa/approvals',
  DISPATCHER: '/insa/sos',
  AUDITOR: '/insa/audit',
  ORG_ADMIN: '/resource/dashboard',
  ORG_OFFICER: '/resource/dashboard',
}

export function hasWebAccess(role: Role | string): boolean {
  return matrixHasWebAccess(role)
}