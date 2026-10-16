// The 7 roles from the permission matrix.
export const ROLES = [
  'citizen',
  'provider',
  'org_admin',
  'dispatcher',
  'higher_officer',
  'auditor',
  'system_admin',
] as const

// A Role can only be one of the strings above.
export type Role = (typeof ROLES)[number]

// Human-readable names for menus and headers.
export const ROLE_LABELS: Record<Role, string> = {
  citizen: 'Citizen',
  provider: 'Provider / Resource Organization',
  org_admin: 'Organization Administrator',
  dispatcher: 'Dispatcher',
  higher_officer: 'Higher Officer',
  auditor: 'Auditor',
  system_admin: 'System Administrator',
}

// Where each role lands after login. Citizens have no web screens.
export const ROLE_HOME_PATH: Record<Role, string | null> = {
  citizen: null,
  provider: '/resource/dashboard',
  org_admin: '/resource/dashboard',
  dispatcher: '/insa/sos',
  higher_officer: '/insa/approvals',
  auditor: '/insa/audit',
  system_admin: '/insa/dashboard',
}

export function hasWebAccess(role: Role): boolean {
  return role !== 'citizen'
}