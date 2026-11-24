import type { User } from '@/types/user'
import { liveApi } from './config'
import {
  liveAssignSos,
  liveFetchSos,
  liveUpdateSosStatus,
  type ApiSosCase,
} from './liveSos'
import { emitMockEvent } from './mockRealtimeBus'

export type SosTicketStatus = 'new' | 'assigned' | 'in_progress' | 'resolved'
export type SosType = 'medical' | 'trapped' | 'missing_person' | 'fire' | 'flood' | 'accident' | 'health' | 'other'

export interface SosTicket {
  id: string
  type: SosType
  status: SosTicketStatus
  region: string
  coordinates: [number, number]
  citizenHash: string
  citizenNameMasked: string
  citizenPhoneMasked: string
  realCitizenName?: string
  realCitizenPhone?: string
  photoUrl?: string
  assignedDispatcher?: string
  notes: string[]
  createdAt: string
  promotedToAlertId?: string
  orgName?: string
  sourceStatus?: string
}

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

const TYPE_MAP: Record<string, SosType> = {
  fire: 'fire',
  flood: 'flood',
  health: 'health',
  missing_person: 'missing_person',
  accident: 'accident',
  other: 'other',
  medical: 'medical',
  trapped: 'trapped',
}

function mapApiStatus(status: string): SosTicketStatus {
  if (status === 'new') return 'new'
  if (status === 'org_reviewing') return 'in_progress'
  if (status === 'submitted' || status === 'verified') return 'assigned'
  if (status === 'resolved' || status === 'rejected') return 'resolved'
  return 'new'
}

function fromApi(row: ApiSosCase): SosTicket {
  return {
    id: `SOS-${row.id}`,
    type: TYPE_MAP[row.case_type] || 'other',
    status: mapApiStatus(row.status),
    region: row.region,
    coordinates: [row.latitude ?? 9.03, row.longitude ?? 38.74],
    citizenHash: `citizen-${row.id}`,
    citizenNameMasked: 'Citizen ****',
    citizenPhoneMasked: '+251 *** *** ***',
    notes: [
      row.description,
      row.org_response ? `Org response: ${row.org_response}` : '',
      row.assigned_organization ? `Assigned org: ${row.assigned_organization}` : '',
    ].filter(Boolean),
    createdAt: row.created_at,
    orgName: row.assigned_organization || row.organization || undefined,
    sourceStatus: row.status,
    assignedDispatcher:
      row.status === 'org_reviewing' || row.status === 'submitted' || row.status === 'verified'
        ? row.assigned_organization || 'Organization / INSA'
        : undefined,
  }
}

function apiId(id: string): number {
  const raw = id.replace(/^SOS-/i, '')
  return Number(raw)
}

let sosTicketsStore: SosTicket[] = [
  {
    id: 'SOS-901',
    type: 'trapped',
    status: 'new',
    region: 'Addis Ababa - Kirkos',
    coordinates: [9.008, 38.761],
    citizenHash: 'eth_id_88f921a4',
    citizenNameMasked: 'T*** G****',
    citizenPhoneMasked: '+251 91* *** 456',
    realCitizenName: 'Tariku Girma',
    realCitizenPhone: '+251 911 234 456',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=500&auto=format&fit=crop&q=60',
    notes: ['Citizen reported trapped on 2nd floor balcony due to ground floor flash flood.'],
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
]

export async function fetchSosTickets(): Promise<SosTicket[]> {
  if (liveApi) {
    const rows = await liveFetchSos()
    return rows.map(fromApi)
  }
  await delay()
  return JSON.parse(JSON.stringify(sosTicketsStore))
}

export async function assignSosTicket(id: string, dispatcherName: string): Promise<SosTicket> {
  if (liveApi) {
    const updated = await liveAssignSos(apiId(id), `Claimed by ${dispatcherName}`)
    const ticket = fromApi(updated)
    ticket.assignedDispatcher = dispatcherName
    return ticket
  }
  await delay()
  const ticket = sosTicketsStore.find((t) => t.id === id)
  if (!ticket) throw new Error('Ticket not found')
  ticket.assignedDispatcher = dispatcherName
  ticket.status = 'assigned'
  emitMockEvent({ type: 'case_changed', caseId: id, status: 'submitted' })
  return JSON.parse(JSON.stringify(ticket))
}

export async function updateSosStatus(id: string, status: SosTicketStatus, note?: string): Promise<SosTicket> {
  if (liveApi) {
    if (status === 'new') {
      const updated = await liveAssignSos(apiId(id), note || '')
      return fromApi(updated)
    }
    const mapped = status === 'resolved' ? 'resolved' : status === 'assigned' ? 'assigned' : 'in_progress'
    const updated = await liveUpdateSosStatus(apiId(id), mapped, note || '')
    return fromApi(updated)
  }
  await delay()
  const ticket = sosTicketsStore.find((t) => t.id === id)
  if (!ticket) throw new Error('Ticket not found')
  ticket.status = status
  if (note) ticket.notes.push(note)
  emitMockEvent({ type: 'case_changed', caseId: id, status: status === 'resolved' ? 'broadcast' : 'under_review' })
  return JSON.parse(JSON.stringify(ticket))
}

export async function promoteMissingPersonToAlert(id: string, user: User): Promise<string> {
  await delay()
  if (liveApi) {
    return `ALT-SOS-${id}`
  }
  const ticket = sosTicketsStore.find((t) => t.id === id)
  if (!ticket) throw new Error('Ticket not found')
  const newAlertId = `ALT-SOS-${ticket.id}`
  ticket.promotedToAlertId = newAlertId
  ticket.notes.push(`Promoted to national broadcast approval queue by ${user.fullName} (${user.role}).`)
  emitMockEvent({ type: 'case_changed', caseId: id, status: 'verified' })
  return newAlertId
}

export async function revealCitizenIdentity(
  ticketId: string,
  user: User,
  justification: string,
  code: string,
): Promise<{ fullName: string; phone: string }> {
  await delay()
  if (code !== '123456') {
    throw new Error('Incorrect 2FA authorization code.')
  }
  if (!justification || justification.trim().length < 20) {
    throw new Error('Minimum 20 characters written justification is legally required for identity unmasking.')
  }

  if (liveApi) {
    return { fullName: 'Masked until Fayda adapter', phone: '+251 *** *** ***' }
  }

  const ticket = sosTicketsStore.find((t) => t.id === ticketId)
  if (!ticket) throw new Error('Ticket not found')

  ticket.notes.push(`[AUDIT RECORD] Identity revealed by ${user.fullName} (${user.role}). Reason: "${justification.trim()}"`)
  emitMockEvent({ type: 'case_changed', caseId: ticketId, status: 'under_review' })

  return {
    fullName: ticket.realCitizenName || 'Tariku Girma',
    phone: ticket.realCitizenPhone || '+251 911 234 456',
  }
}
