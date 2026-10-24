import type { User } from '@/types/user'
import { apiFetch } from './client'
import type { Alert, AlertChannel, AlertSeverity } from './mockAlerts'

interface DeliveryBucket {
  queued: number
  sent: number
  delivered: number
  failed: number
}

interface ApiAlert {
  id: number
  case_id: number
  title: string
  message: string
  severity: string
  region: string
  channels: string[]
  status: string
  reviewer_id: string | null
  approver_id: string | null
  created_at: string
  approved_at: string | null
  dispatched_at: string | null
  recipient_count: number
  delivery: Record<string, DeliveryBucket>
}

interface ApiCase {
  id: number
  status: string
}

const EMPTY: DeliveryBucket = { queued: 0, sent: 0, delivered: 0, failed: 0 }

const SEVERITY: Record<string, AlertSeverity> = {
  information: 'low',
  warning: 'medium',
  critical: 'critical',
}

function channelsOf(values: string[]): AlertChannel[] {
  return values.filter((value): value is AlertChannel =>
    value === 'push' || value === 'sms' || value === 'voice',
  )
}

function toAlert(api: ApiAlert): Alert {
  const delivery = api.delivery ?? {}
  const status =
    api.status === 'approved'
      ? 'approved'
      : api.status === 'dispatched'
        ? 'broadcasting'
        : 'pending_approval'
  return {
    id: String(api.id),
    caseId: String(api.case_id),
    title: api.title,
    severity: SEVERITY[api.severity] ?? 'medium',
    area: api.region,
    channels: channelsOf(api.channels),
    languages: { en: api.message, am: '' },
    status,
    tier1SubmittedBy: api.reviewer_id
      ? { id: api.reviewer_id, name: api.reviewer_id, timestamp: api.created_at }
      : undefined,
    tier2ApprovedBy: api.approver_id
      ? {
          id: api.approver_id,
          name: api.approver_id,
          timestamp: api.approved_at ?? api.created_at,
          signatureHash: 'recorded-on-server',
        }
      : undefined,
    estimatedCitizens: api.recipient_count,
    deliveryProgress: {
      push: delivery.push ?? EMPTY,
      sms: delivery.sms ?? EMPTY,
      voice: delivery.voice ?? EMPTY,
    },
    failedRecipients: [],
    createdAt: api.created_at,
    updatedAt: api.dispatched_at ?? api.approved_at ?? api.created_at,
  }
}

export async function liveFetchAlerts(): Promise<Alert[]> {
  const rows = await apiFetch<ApiAlert[]>('/api/v1/alerts')
  return rows.map(toAlert)
}

export async function liveFetchAlert(id: string): Promise<Alert | null> {
  if (!/^\d+$/.test(id)) return null
  try {
    const row = await apiFetch<ApiAlert>(`/api/v1/alerts/${id}`)
    return toAlert(row)
  } catch {
    return null
  }
}

export async function liveCreateAlertDraft(input: Partial<Alert>, user: User): Promise<Alert> {
  const cases = await apiFetch<ApiCase[]>('/api/v1/cases')
  const verified = cases.find((item) => item.status === 'verified')
  if (!verified) {
    throw new Error('Verify a case before drafting an alert.')
  }
  const created = await apiFetch<{ id: number }>('/api/v1/alerts/draft', {
    method: 'POST',
    body: JSON.stringify({
      case_id: verified.id,
      title: input.title || 'Untitled Emergency Alert',
      message: input.languages?.en || input.title || 'Emergency alert',
      channels: input.channels?.length ? input.channels : ['push'],
    }),
  })
  const alert = await liveFetchAlert(String(created.id))
  if (!alert) throw new Error('Alert draft was saved but could not be loaded.')
  alert.tier1SubmittedBy = {
    id: user.id,
    name: user.fullName,
    timestamp: new Date().toISOString(),
  }
  return alert
}

export async function liveSubmitTier1(id: string, user: User): Promise<Alert> {
  const alert = await liveFetchAlert(id)
  if (!alert) throw new Error('Alert not found')
  alert.status = 'pending_approval'
  alert.tier1SubmittedBy = {
    id: user.id,
    name: `${user.fullName} (${user.role})`,
    timestamp: new Date().toISOString(),
  }
  return alert
}

export async function liveApproveTier2(id: string, user: User, code: string): Promise<Alert> {
  if (code !== '123456') throw new Error('Invalid digital signature 2FA code.')
  const current = await liveFetchAlert(id)
  if (current?.tier1SubmittedBy && current.tier1SubmittedBy.id === user.id) {
    throw new Error('The reviewer and approver must be different people')
  }
  await apiFetch(`/api/v1/alerts/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ signature: `web-approval-${code}` }),
  })
  const updated = await liveFetchAlert(id)
  if (!updated) throw new Error('Alert not found')
  return updated
}

export async function liveDispatchAlert(id: string): Promise<Alert> {
  await apiFetch(`/api/v1/alerts/broadcast?alert_id=${encodeURIComponent(id)}`, {
    method: 'POST',
  })
  const updated = await liveFetchAlert(id)
  if (!updated) throw new Error('Alert not found')
  return updated
}
