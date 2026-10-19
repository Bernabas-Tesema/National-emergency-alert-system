import type {
  AuditAction,
  AuditEntry,
  AuditOutcome,
  AuditPage,
  AuditQuery,
} from '@/types/audit'
import type { Role } from '@/types/role'

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

// Everything here is invented. The IP addresses come from the ranges reserved
// for documentation, so they never point at a real device.
interface Actor {
  name: string
  role: Role | null
  ip: string
}

const MARTA: Actor = { name: 'Marta Haile', role: 'system_admin', ip: '192.0.2.10' }
const HANNA: Actor = { name: 'Hanna Bekele', role: 'higher_officer', ip: '192.0.2.21' }
const YONAS: Actor = { name: 'Yonas Girma', role: 'auditor', ip: '192.0.2.33' }
const SELAM: Actor = { name: 'Selam Tesfaye', role: 'org_admin', ip: '198.51.100.12' }
const ABEBE: Actor = { name: 'Abebe Kebede', role: 'provider', ip: '198.51.100.30' }
const UNKNOWN_A: Actor = { name: 'Unknown (sysadmin1)', role: null, ip: '203.0.113.7' }
const UNKNOWN_B: Actor = { name: 'Unknown (provider1)', role: null, ip: '203.0.113.45' }

interface Template {
  actor: Actor
  action: AuditAction
  target: string
  outcome: AuditOutcome
}

const TEMPLATES: Template[] = [
  { actor: MARTA, action: 'login_success', target: 'Web portal', outcome: 'success' },
  { actor: ABEBE, action: 'case_submitted', target: 'CASE-1002', outcome: 'success' },
  { actor: UNKNOWN_A, action: 'login_failed', target: 'Web portal', outcome: 'failure' },
  { actor: HANNA, action: 'case_decision', target: 'CASE-1001 (approved)', outcome: 'success' },
  { actor: MARTA, action: 'alert_dispatched', target: 'ALT-2026-0892 (Bole)', outcome: 'success' },
  { actor: SELAM, action: 'officer_added', target: 'Rahel Assefa', outcome: 'success' },
  { actor: MARTA, action: 'account_suspended', target: 'Kebede Mamo', outcome: 'success' },
  { actor: MARTA, action: 'role_changed', target: 'Dawit Alemu (dispatcher to higher_officer)', outcome: 'success' },
  { actor: HANNA, action: 'raw_identity_viewed', target: 'Citizen reference a8f5…b912', outcome: 'success' },
  { actor: SELAM, action: 'account_reset', target: 'Tigist Worku', outcome: 'success' },
  { actor: MARTA, action: 'organization_registered', target: 'Addis Ababa Health Bureau', outcome: 'success' },
  { actor: ABEBE, action: 'login_success', target: 'Web portal', outcome: 'success' },
  { actor: UNKNOWN_B, action: 'login_failed', target: 'Web portal', outcome: 'failure' },
  { actor: YONAS, action: 'audit_exported', target: 'Audit log (CSV)', outcome: 'success' },
  { actor: MARTA, action: 'account_reactivated', target: 'Kebede Mamo', outcome: 'success' },
  { actor: MARTA, action: 'organization_suspended', target: 'Demo Agency', outcome: 'success' },
]

const ENTRY_COUNT = 48
const NEWEST = Date.UTC(2026, 9, 16, 9, 0, 0) // 16 Oct 2026, 09:00 UTC
const STEP_MS = 47 * 60 * 1000 // 47 minutes between entries

// Newest first, with fixed times so the data is the same on every run.
const ALL: AuditEntry[] = Array.from({ length: ENTRY_COUNT }, (_, i): AuditEntry => {
  const t = TEMPLATES[i % TEMPLATES.length]
  return {
    id: `a-${1000 + i}`,
    timestamp: new Date(NEWEST - i * STEP_MS).toISOString(),
    actorName: t.actor.name,
    actorRole: t.actor.role,
    action: t.action,
    target: t.target,
    outcome: t.outcome,
    ipAddress: t.actor.ip,
  }
})

// Read-only on purpose: the server writes audit entries, and nothing in the
// browser may add, change or delete one. Real version: GET /audit-log with
// these same filters, applied by the server.
export async function fetchAuditLog(query: AuditQuery): Promise<AuditPage> {
  await delay()
  const needle = query.search.trim().toLowerCase()

  const matches = ALL.filter((e) => {
    if (query.action && e.action !== query.action) return false
    const day = e.timestamp.slice(0, 10)
    if (query.from && day < query.from) return false
    if (query.to && day > query.to) return false
    if (needle && !`${e.actorName} ${e.target}`.toLowerCase().includes(needle)) {
      return false
    }
    return true
  })

  const start = (Math.max(query.page, 1) - 1) * query.pageSize
  return {
    entries: matches.slice(start, start + query.pageSize).map((e) => ({ ...e })),
    total: matches.length,
  }
}