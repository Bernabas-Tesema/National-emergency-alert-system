/**
 * packages/core/src/permissions/matrix.ts
 *
 * THE SINGLE SOURCE OF TRUTH FOR STAFF ROLES AND THE PERMISSION MATRIX.
 * All route guards, UI visibility hooks (<Can>, <RequireRole>), and API mocks
 * must read from this file.
 */

export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMINISTRATOR',
  'HIGHER_OFFICER',
  'DISPATCHER',
  'AUDITOR',
  'ORG_ADMIN',
  'ORG_OFFICER',
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const ALL_ROLES = [...STAFF_ROLES, 'CITIZEN'] as const
export type Role = (typeof ALL_ROLES)[number]

export const PERMISSIONS = [
  // Cases (Resource Org & INSA review)
  'case.create',
  'case.edit_draft',
  'case.submit',
  'case.update_status',
  'case.view_own',
  'case.view_all',
  'case.verify',
  'case.clarify',
  'case.reject',
  'case.merge',

  // Public Alerts & Two-Tier Approval
  'alert.compose',
  'alert.submit_tier1',
  'alert.approve_tier2',
  'alert.dispatch',
  'alert.cancel',
  'alert.view',

  // SOS Operations
  'sos.view',
  'sos.assign',
  'sos.update_status',
  'sos.escalate',
  'sos.reveal_identity',

  // Administration & Governance
  'org.manage',
  'org.manage_own_officers',
  'staff.manage',
  'settings.manage',
  'gateways.manage',
  'audit.view',
  'reports.view_org',
  'reports.view_national',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLE_LABELS: Record<StaffRole | 'CITIZEN', string> = {
  SUPER_ADMIN: 'Super Administrator (INSA)',
  ADMINISTRATOR: 'Administrator (INSA)',
  HIGHER_OFFICER: 'Higher Officer (Tier-2 Approver)',
  DISPATCHER: 'Emergency Dispatcher (SOS)',
  AUDITOR: 'Compliance Auditor (INSA)',
  ORG_ADMIN: 'Organization Administrator',
  ORG_OFFICER: 'Organization Officer',
  CITIZEN: 'Citizen (Mobile App)',
}

export const PERMISSION_MATRIX: Record<StaffRole, readonly Permission[]> = {
  SUPER_ADMIN: [
    'org.manage',
    'staff.manage',
    'settings.manage',
    'gateways.manage',
    'audit.view',
    'reports.view_national',
    'case.view_all',
    'alert.view',
    'sos.view',
    'case.verify',
    'case.clarify',
    'case.reject',
    'alert.compose',
    'alert.submit_tier1',
    'alert.approve_tier2',
    'alert.dispatch',
    'alert.cancel',
    'sos.assign',
    'sos.update_status',
    'sos.escalate',
    'sos.reveal_identity',
  ],

  ADMINISTRATOR: [
    'case.view_all',
    'case.verify',
    'case.clarify',
    'case.reject',
    'case.merge',
    'alert.compose',
    'alert.submit_tier1',
    'alert.dispatch',
    'alert.cancel',
    'alert.view',
    'sos.view',
    'sos.assign',
    'sos.update_status',
    'sos.escalate',
  ],

  HIGHER_OFFICER: [
    'alert.approve_tier2',
    'alert.view',
    'case.view_all',
    'audit.view',
    'reports.view_national',
  ],

  DISPATCHER: [
    'sos.view',
    'sos.assign',
    'sos.update_status',
    'sos.escalate',
    'sos.reveal_identity',
  ],

  AUDITOR: [
    'audit.view',
    'reports.view_national',
    'case.view_all',
    'alert.view',
  ],

  ORG_ADMIN: [
    'case.create',
    'case.edit_draft',
    'case.submit',
    'case.update_status',
    'case.view_own',
    'org.manage_own_officers',
    'reports.view_org',
  ],

  ORG_OFFICER: [
    'case.create',
    'case.edit_draft',
    'case.submit',
    'case.update_status',
    'case.view_own',
  ],
}

/**
 * Normalizes any legacy string (e.g. "system_admin", "provider")
 * to its canonical StaffRole enum value.
 */
export function canonicalRole(raw: string | null | undefined): StaffRole | 'CITIZEN' | null {
  if (!raw) return null
  const clean = raw.trim().toUpperCase().replace(/-/g, '_')

  if (clean === 'SYSTEM_ADMIN' || clean === 'SUPER_ADMIN') return 'SUPER_ADMIN'
  if (clean === 'ADMINISTRATOR' || clean === 'ADMIN') return 'ADMINISTRATOR'
  if (clean === 'HIGHER_OFFICER') return 'HIGHER_OFFICER'
  if (clean === 'DISPATCHER') return 'DISPATCHER'
  if (clean === 'AUDITOR') return 'AUDITOR'
  if (clean === 'ORG_ADMIN') return 'ORG_ADMIN'
  if (clean === 'ORG_OFFICER' || clean === 'PROVIDER') return 'ORG_OFFICER'
  if (clean === 'CITIZEN') return 'CITIZEN'

  return null
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  const norm = canonicalRole(role)
  if (!norm || norm === 'CITIZEN') return false
  return PERMISSION_MATRIX[norm]?.includes(permission) ?? false
}

export function isRoleAllowed(userRole: string | null | undefined, allowedRoles: readonly string[]): boolean {
  const norm = canonicalRole(userRole)
  if (!norm) return false
  return allowedRoles.some((allowed) => {
    const normAllowed = canonicalRole(allowed)
    return normAllowed === norm || allowed.toLowerCase() === (userRole ?? '').toLowerCase()
  })
}

export const ROLE_HOME_PATH: Record<StaffRole | 'CITIZEN', string | null> = {
  SUPER_ADMIN: '/insa/dashboard',
  ADMINISTRATOR: '/insa/dashboard',
  HIGHER_OFFICER: '/insa/approvals',
  DISPATCHER: '/insa/sos',
  AUDITOR: '/insa/audit',
  ORG_ADMIN: '/resource/dashboard',
  ORG_OFFICER: '/resource/dashboard',
  CITIZEN: null,
}

export function hasWebAccess(role: string | null | undefined): boolean {
  const norm = canonicalRole(role)
  return norm !== null && norm !== 'CITIZEN'
}
