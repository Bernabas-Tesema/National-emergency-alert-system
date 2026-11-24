import type { Role } from './role'

export const AUDIT_ACTIONS = [
  'login_success',
  'login_failed',
  'case_submitted',
  'case_decision',
  'alert_dispatched',
  'officer_added',
  'account_suspended',
  'account_reactivated',
  'account_reset',
  'role_changed',
  'organization_registered',
  'organization_suspended',
  'raw_identity_viewed',
  'audit_exported',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  login_success: 'Sign-in',
  login_failed: 'Failed sign-in',
  case_submitted: 'Case submitted',
  case_decision: 'Case decision',
  alert_dispatched: 'Alert dispatched',
  officer_added: 'Officer added',
  account_suspended: 'Account suspended',
  account_reactivated: 'Account reactivated',
  account_reset: 'Account reset',
  role_changed: 'Role changed',
  organization_registered: 'Organization registered',
  organization_suspended: 'Organization suspended',
  raw_identity_viewed: 'Raw identity viewed',
  audit_exported: 'Audit log exported',
}

export type AuditOutcome = 'success' | 'failure'

export interface AuditEntry {
  id: string
  timestamp: string // ISO date string, in UTC
  actorName: string
  actorRole: Role | null // null when the person could not be identified
  action: AuditAction
  target: string
  outcome: AuditOutcome
  ipAddress: string
}

// What the page asks for. Dates are YYYY-MM-DD, and '' means "no filter".
export interface AuditQuery {
  action: AuditAction | ''
  search: string
  from: string
  to: string
  page: number // starts at 1
  pageSize: number
}

export interface AuditPage {
  entries: AuditEntry[]
  total: number // how many entries match, across all pages
}