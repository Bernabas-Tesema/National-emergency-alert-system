import type { AuditAction, AuditEntry, AuditPage, AuditQuery } from '@/types/audit'
import type { Role } from '@/types/role'
import { apiFetch } from './client'

interface ApiAudit {
  id: number
  actor: string
  action: string
  resource: string
  ip_address: string
  created_at: string
}

const ACTION_MAP: Record<string, AuditAction> = {
  staff_login: 'login_success',
  citizen_login: 'login_success',
  case_created: 'case_submitted',
  sos_submitted: 'case_submitted',
  case_resubmitted: 'case_submitted',
  case_verify: 'case_decision',
  case_reject: 'case_decision',
  case_clarification: 'case_decision',
  alert_drafted: 'case_decision',
  alert_approved: 'case_decision',
  alert_dispatched: 'alert_dispatched',
}

const ROLE_BY_ACTOR: Record<string, Role> = {
  insa_admin: 'ADMINISTRATOR',
  insa_officer: 'HIGHER_OFFICER',
  org_officer: 'ORG_OFFICER',
}

function toEntry(row: ApiAudit): AuditEntry {
  return {
    id: String(row.id),
    timestamp: row.created_at,
    actorName: row.actor,
    actorRole: ROLE_BY_ACTOR[row.actor] ?? null,
    action: ACTION_MAP[row.action] ?? 'case_decision',
    target: row.resource,
    outcome: 'success',
    ipAddress: row.ip_address,
  }
}

export async function liveFetchAuditLog(query: AuditQuery): Promise<AuditPage> {
  const rows = await apiFetch<ApiAudit[]>('/api/v1/audit')
  const needle = query.search.trim().toLowerCase()
  const matches = rows.map(toEntry).filter((entry) => {
    if (query.action && entry.action !== query.action) return false
    const day = entry.timestamp.slice(0, 10)
    if (query.from && day < query.from) return false
    if (query.to && day > query.to) return false
    if (needle && !`${entry.actorName} ${entry.target}`.toLowerCase().includes(needle)) return false
    return true
  })
  const start = (Math.max(query.page, 1) - 1) * query.pageSize
  return {
    entries: matches.slice(start, start + query.pageSize),
    total: matches.length,
  }
}
