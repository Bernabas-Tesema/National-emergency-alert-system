/**
 * packages/core/src/permissions/matrix.ts
 *
 * THE SINGLE SOURCE OF TRUTH FOR STAFF ROLES AND THE PERMISSION MATRIX.
 * All route guards, UI visibility hooks (<Can>, <RequireRole>), and API mocks
 * must read from this file.
 *
 * ROLES:
 *   ADMINISTRATOR  — Full-access INSA admin (merged from former SUPER_ADMIN + ADMINISTRATOR)
 *   HIGHER_OFFICER — Tier-2 alert approver / senior reviewer
 *   DISPATCHER     — SOS operations only
 *   AUDITOR        — Read-only compliance & reports
 *   ORG_ADMIN      — Partner organisation administrator
 *   ORG_OFFICER    — Partner organisation field officer
 */

export const STAFF_ROLES = [
  'ADMINISTRATOR',
  'HIGHER_OFFICER',
  'DISPATCHER',
  'AUDITOR',
  'ORG_ADMIN',
  'ORG_OFFICER',
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const ALL_ROLES = [...STAFF_ROLES] as const
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

  // Public Alerts & Approval
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

export const ROLE_LABELS: Record<StaffRole, string> = {
  ADMINISTRATOR: 'Administrator (Ethio Alert)',
  HIGHER_OFFICER: 'Higher Officer (Tier-2 Approver)',
  DISPATCHER: 'Emergency Dispatcher (SOS)',
  AUDITOR: 'Compliance Auditor (Ethio Alert)',
  ORG_ADMIN: 'Organization Administrator',
  ORG_OFFICER: 'Organization Officer',
}

export const PERMISSION_MATRIX: Record<StaffRole, readonly Permission[]> = {
  ADMINISTRATOR: [
    // Full system control (merged SUPER_ADMIN + ADMINISTRATOR)
    'org.manage',
    'staff.manage',
    'settings.manage',
    'gateways.manage',
    'audit.view',
    'reports.view_national',
    'case.view_all',
    'case.verify',
    'case.clarify',
    'case.reject',
    'case.merge',
    'alert.compose',
    'alert.submit_tier1',
    'alert.approve_tier2',
    'alert.dispatch',
    'alert.cancel',
    'alert.view',
    'sos.view',
    'sos.assign',
    'sos.update_status',
    'sos.escalate',
    'sos.reveal_identity',
  ],

  HIGHER_OFFICER: [
    'alert.approve_tier2',
    'alert.view',
    'case.view_all',
    'audit.view',
    'reports.view_national',
    'sos.view',
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
    'sos.view',
  ],

  ORG_ADMIN: [
    'case.create',
    'case.edit_draft',
    'case.submit',
    'case.update_status',
    'case.view_own',
    'org.manage_own_officers',
    'reports.view_org',
    'sos.view',
    'sos.update_status',
    'sos.escalate',
    'alert.view',
  ],

  ORG_OFFICER: [
    'case.create',
    'case.edit_draft',
    'case.submit',
    'case.update_status',
    'case.view_own',
    'sos.view',
    'sos.update_status',
    'sos.escalate',
    'alert.view',
  ],
}

/**
 * Normalizes any legacy string (e.g. "system_admin", "SUPER_ADMIN", "provider")
 * to its canonical StaffRole enum value.
 */
export function canonicalRole(raw: string | null | undefined): StaffRole | null {
  if (!raw) return null
  const clean = raw.trim().toUpperCase().replace(/-/g, '_')

  if (clean === 'SYSTEM_ADMIN' || clean === 'SUPER_ADMIN' || clean === 'ADMINISTRATOR' || clean === 'ADMIN') return 'ADMINISTRATOR'
  if (clean === 'HIGHER_OFFICER') return 'HIGHER_OFFICER'
  if (clean === 'DISPATCHER') return 'DISPATCHER'
  if (clean === 'AUDITOR') return 'AUDITOR'
  if (clean === 'ORG_ADMIN') return 'ORG_ADMIN'
  if (clean === 'ORG_OFFICER' || clean === 'PROVIDER') return 'ORG_OFFICER'

  return null
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  const norm = canonicalRole(role)
  if (!norm) return false
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

export const ROLE_HOME_PATH: Record<StaffRole, string | null> = {
  ADMINISTRATOR: '/insa/dashboard',
  HIGHER_OFFICER: '/insa/approvals',
  DISPATCHER: '/insa/sos',
  AUDITOR: '/insa/audit',
  ORG_ADMIN: '/resource/dashboard',
  ORG_OFFICER: '/resource/dashboard',
}

export function hasWebAccess(role: string | null | undefined): boolean {
  return canonicalRole(role) !== null
}
