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
  exactAddress?: string
  accuracyMeters?: number
  peopleCount?: string
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
    region: row.region || 'Addis Ababa',
    coordinates: [row.latitude ?? 9.03, row.longitude ?? 38.74],
    exactAddress: row.region ? `${row.region}, Landmark Area` : 'Addis Ababa Central Zone',
    accuracyMeters: 8,
    peopleCount: '1-2 persons',
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
    exactAddress: 'Kirkos Sub-City, Woreda 02, House 104, near Gotera Interchange',
    coordinates: [9.0080, 38.7610],
    accuracyMeters: 6,
    peopleCount: '2 adults, 1 child',
    citizenHash: 'eth_id_88f921a4',
    citizenNameMasked: 'T*** G****',
    citizenPhoneMasked: '+251 91* *** 456',
    realCitizenName: 'Tariku Girma',
    realCitizenPhone: '+251 911 234 456',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=500&auto=format&fit=crop&q=60',
    notes: ['Citizen reported trapped on 2nd floor balcony due to ground floor flash flood.'],
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'SOS-902',
    type: 'fire',
    status: 'new',
    region: 'Addis Ababa - Bole Medhanealem',
    exactAddress: 'Bole Sub-City, Woreda 03, Cameroon St., Commercial Center 4th Floor',
    coordinates: [8.9984, 38.7889],
    accuracyMeters: 4,
    peopleCount: '5 individuals',
    citizenHash: 'eth_id_bf4401d2',
    citizenNameMasked: 'M*** K****',
    citizenPhoneMasked: '+251 91* *** 889',
    realCitizenName: 'Mekdes Kebede',
    realCitizenPhone: '+251 911 556 889',
    notes: ['Electrical room fire producing heavy toxic smoke in corridor. Escape stairs compromised.'],
    createdAt: new Date(Date.now() - 720000).toISOString(),
  },
  {
    id: 'SOS-903',
    type: 'missing_person',
    status: 'in_progress',
    region: 'Addis Ababa - Yeka Sub-City',
    exactAddress: 'Yeka Sub-City, Woreda 07, near British Embassy forest perimeter',
    coordinates: [9.0435, 38.8021],
    accuracyMeters: 15,
    peopleCount: '1 missing child (8 yrs)',
    citizenHash: 'eth_id_7709c311',
    citizenNameMasked: 'B*** A****',
    citizenPhoneMasked: '+251 92* *** 440',
    realCitizenName: 'Biruk Assefa',
    realCitizenPhone: '+251 922 890 440',
    photoUrl: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=500&auto=format&fit=crop&q=60',
    notes: ['Child went missing during heavy rain squall near hillside park trail.'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'SOS-904',
    type: 'medical',
    status: 'assigned',
    region: 'Oromia - Adama City',
    exactAddress: 'Adama Kebele 04, near Stadium roundabout, House 318',
    coordinates: [8.5400, 39.2700],
    accuracyMeters: 5,
    peopleCount: '1 patient (critical)',
    citizenHash: 'eth_id_ee31889a',
    citizenNameMasked: 'H*** T****',
    citizenPhoneMasked: '+251 93* *** 771',
    realCitizenName: 'Haile Tadesse',
    realCitizenPhone: '+251 935 901 771',
    assignedDispatcher: 'Adama Red Cross EMS',
    notes: ['Cardiac emergency, patient unresponsive. Field ambulance dispatched at 11:20.'],
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
]

export function registerIncomingCitizenSos(partial: {
  type: SosType
  region: string
  coordinates?: [number, number]
  exactAddress?: string
  accuracyMeters?: number
  peopleCount?: string
  notes?: string[]
  citizenName?: string
  citizenPhone?: string
}): SosTicket {
  const newId = `SOS-${Math.floor(920 + Math.random() * 800)}`
  const newTicket: SosTicket = {
    id: newId,
    type: partial.type || 'other',
    status: 'new',
    region: partial.region || 'Addis Ababa',
    exactAddress: partial.exactAddress || `${partial.region}, Landmark Area`,
    coordinates: partial.coordinates || [9.0080, 38.7610],
    accuracyMeters: partial.accuracyMeters || 6,
    peopleCount: partial.peopleCount || '1-2 persons',
    citizenHash: `eth_id_${Math.random().toString(36).substring(2, 10)}`,
    citizenNameMasked: partial.citizenName ? `${partial.citizenName.slice(0, 1)}***` : 'Citizen ****',
    citizenPhoneMasked: partial.citizenPhone ? `${partial.citizenPhone.slice(0, 6)}***` : '+251 91* *** ***',
    realCitizenName: partial.citizenName,
    realCitizenPhone: partial.citizenPhone,
    notes: partial.notes || ['Citizen emergency distress signal dispatched to INSA.'],
    createdAt: new Date().toISOString(),
  }
  sosTicketsStore.unshift(newTicket)
  emitMockEvent({ type: 'case_changed', caseId: newId, status: 'submitted' })
  return newTicket
}

export function simulateInboundSosTicket(): SosTicket {
  const samples = [
    {
      type: 'trapped' as SosType,
      region: 'Addis Ababa - Kirkos Woreda 03',
      exactAddress: 'Kirkos Sub-City, Gabon St., Building 12, Floor 4',
      coordinates: [9.0065, 38.7589] as [number, number],
      accuracyMeters: 5,
      peopleCount: '3 people trapped',
      description: 'Elevator power failure with water leaking into shaft. Alarm bells sounding.',
      citizenNameMasked: 'D*** Z****',
      realCitizenName: 'Dawit Zewdu',
      citizenPhoneMasked: '+251 91* *** 332',
      realCitizenPhone: '+251 911 345 332',
    },
    {
      type: 'flood' as SosType,
      region: 'Addis Ababa - Akaki Kality',
      exactAddress: 'Akaki Sub-City, Woreda 01, Riverbank settlement Block 9',
      coordinates: [8.8741, 38.7712] as [number, number],
      accuracyMeters: 8,
      peopleCount: '4 people (including 1 elderly)',
      description: 'Akaki River overflowed banks rapidly. Water up to window sill.',
      citizenNameMasked: 'E*** M****',
      realCitizenName: 'Eleni Mengistu',
      citizenPhoneMasked: '+251 92* *** 554',
      realCitizenPhone: '+251 922 789 554',
    },
    {
      type: 'accident' as SosType,
      region: 'Addis Ababa - Gotera Flyover',
      exactAddress: 'Gotera Interchange flyover inbound ramp, Debre Zeit Rd junction',
      coordinates: [8.9862, 38.7554] as [number, number],
      accuracyMeters: 4,
      peopleCount: 'Multiple injured',
      description: 'Overturned tanker blocking 2 lanes. Hazardous chemical smell detected.',
      citizenNameMasked: 'S*** W****',
      realCitizenName: 'Solomon Worku',
      citizenPhoneMasked: '+251 91* *** 881',
      realCitizenPhone: '+251 911 901 881',
    },
  ]

  const pick = samples[Math.floor(Math.random() * samples.length)]
  const newId = `SOS-${Math.floor(905 + Math.random() * 800)}`
  const newTicket: SosTicket = {
    id: newId,
    type: pick.type,
    status: 'new',
    region: pick.region,
    exactAddress: pick.exactAddress,
    coordinates: pick.coordinates,
    accuracyMeters: pick.accuracyMeters,
    peopleCount: pick.peopleCount,
    citizenHash: `eth_id_${Math.random().toString(36).substring(2, 10)}`,
    citizenNameMasked: pick.citizenNameMasked,
    citizenPhoneMasked: pick.citizenPhoneMasked,
    realCitizenName: pick.realCitizenName,
    realCitizenPhone: pick.realCitizenPhone,
    notes: [pick.description],
    createdAt: new Date().toISOString(),
  }

  sosTicketsStore.unshift(newTicket)
  emitMockEvent({ type: 'case_changed', caseId: newId, status: 'submitted' })
  return newTicket
}

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
