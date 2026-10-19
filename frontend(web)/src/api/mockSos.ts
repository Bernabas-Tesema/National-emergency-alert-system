import type { User } from '@/types/user'
import { emitMockEvent } from './mockRealtimeBus'

export type SosTicketStatus = 'new' | 'assigned' | 'in_progress' | 'resolved'
export type SosType = 'medical' | 'trapped' | 'missing_person' | 'fire' | 'flood'

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
}

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

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
  {
    id: 'SOS-902',
    type: 'medical',
    status: 'assigned',
    region: 'Oromia - East Shewa (Adama)',
    coordinates: [8.541, 39.271],
    citizenHash: 'eth_id_12b774c9',
    citizenNameMasked: 'A**** K*****',
    citizenPhoneMasked: '+251 92* *** 882',
    realCitizenName: 'Aster Kebede',
    realCitizenPhone: '+251 922 881 882',
    assignedDispatcher: 'Dawit Alemu (Dispatcher)',
    notes: ['Dispatched Red Cross ambulance unit 4. ETA 8 minutes.'],
    createdAt: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'SOS-903',
    type: 'missing_person',
    status: 'in_progress',
    region: 'Addis Ababa - Bole (Bulbula)',
    coordinates: [8.981, 38.789],
    citizenHash: 'eth_id_65e311a2',
    citizenNameMasked: 'B**** L****',
    citizenPhoneMasked: '+251 94* *** 901',
    realCitizenName: 'Birhanu Lemma',
    realCitizenPhone: '+251 944 551 901',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
    assignedDispatcher: 'Dawit Alemu (Dispatcher)',
    notes: ['Child separated from family during sudden evacuation near Bulbula river.'],
    createdAt: new Date(Date.now() - 2800000).toISOString(),
  },
  {
    id: 'SOS-904',
    type: 'fire',
    status: 'resolved',
    region: 'Addis Ababa - Addis Ketema',
    coordinates: [9.032, 38.734],
    citizenHash: 'eth_id_99f220c3',
    citizenNameMasked: 'M**** H****',
    citizenPhoneMasked: '+251 93* *** 331',
    realCitizenName: 'Mohammed Hassen',
    realCitizenPhone: '+251 933 112 331',
    assignedDispatcher: 'Dawit Alemu (Dispatcher)',
    notes: ['Fire extinguished by Mercato emergency station. No casualties.'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

export async function fetchSosTickets(): Promise<SosTicket[]> {
  await delay()
  return JSON.parse(JSON.stringify(sosTicketsStore))
}

export async function assignSosTicket(id: string, dispatcherName: string): Promise<SosTicket> {
  await delay()
  const ticket = sosTicketsStore.find((t) => t.id === id)
  if (!ticket) throw new Error('Ticket not found')
  ticket.assignedDispatcher = dispatcherName
  ticket.status = 'assigned'
  emitMockEvent({ type: 'case_changed', caseId: id, status: 'submitted' })
  return JSON.parse(JSON.stringify(ticket))
}

export async function updateSosStatus(id: string, status: SosTicketStatus, note?: string): Promise<SosTicket> {
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

  const ticket = sosTicketsStore.find((t) => t.id === ticketId)
  if (!ticket) throw new Error('Ticket not found')

  ticket.notes.push(`[AUDIT RECORD] Identity revealed by ${user.fullName} (${user.role}). Reason: "${justification.trim()}"`)
  emitMockEvent({ type: 'case_changed', caseId: ticketId, status: 'under_review' })

  return {
    fullName: ticket.realCitizenName || 'Tariku Girma',
    phone: ticket.realCitizenPhone || '+251 911 234 456',
  }
}
