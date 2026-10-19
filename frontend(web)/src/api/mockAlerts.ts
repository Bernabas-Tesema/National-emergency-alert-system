import type { User } from '@/types/user'
import { emitMockEvent } from './mockRealtimeBus'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertChannel = 'push' | 'sms' | 'voice'
export type AlertStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'broadcasting'
  | 'delivered'
  | 'cancelled'

export interface ChannelMetrics {
  queued: number
  sent: number
  delivered: number
  failed: number
}

export interface FailedRecipient {
  id: string
  phoneMasked: string
  channel: AlertChannel
  reason: string
}

export interface Alert {
  id: string
  caseId?: string
  title: string
  severity: AlertSeverity
  area: string
  channels: AlertChannel[]
  languages: {
    en: string
    am: string
    om?: string
    ti?: string
    so?: string
  }
  status: AlertStatus
  tier1SubmittedBy?: {
    id: string
    name: string
    timestamp: string
  }
  tier2ApprovedBy?: {
    id: string
    name: string
    timestamp: string
    signatureHash: string
  }
  isFastTrack?: boolean
  fastTrackReason?: string
  estimatedCitizens: number
  deliveryProgress: Record<AlertChannel, ChannelMetrics>
  failedRecipients: FailedRecipient[]
  createdAt: string
  updatedAt: string
}

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

let alertsStore: Alert[] = [
  {
    id: 'ALT-101',
    caseId: 'ETH-001',
    title: 'URGENT: Flash Flood Inundation - Awash River Basin',
    severity: 'critical',
    area: 'Oromia - East Shewa (Mojo, Adama corridor)',
    channels: ['push', 'sms', 'voice'],
    languages: {
      en: 'EMERGENCY: Rapidly rising flood waters in Awash basin. Move to higher ground immediately. Avoid bridge crossings.',
      am: 'አስቸኳይ ማስጠንቀቂያ፡ በአዋሽ ተፋሰስ ፈጣን የውሃ ሙላት በመከሰቱ ወዲያውኑ ወደ ከፍታ ቦታዎች ይሸሹ። ድልድዮችን አይሻገሩ።',
      om: 'AKEEKKACHIISA: Loolaan humnaa ol laggeen Awaash keessatti dabalaa jira. Hatattamaan gara bakka olka\'aatti baqadhaa.',
    },
    status: 'broadcasting',
    tier1SubmittedBy: {
      id: 'u-008',
      name: 'Tewodros Kassahun (Administrator)',
      timestamp: '2026-10-18T10:15:00Z',
    },
    tier2ApprovedBy: {
      id: 'u-004',
      name: 'Hanna Bekele (Higher Officer)',
      timestamp: '2026-10-18T10:22:00Z',
      signatureHash: 'sig_ed25519_98af21d09e',
    },
    estimatedCitizens: 345000,
    deliveryProgress: {
      push: { queued: 5000, sent: 120000, delivered: 118400, failed: 1600 },
      sms: { queued: 12000, sent: 180000, delivered: 172300, failed: 7700 },
      voice: { queued: 3000, sent: 40000, delivered: 38200, failed: 1800 },
    },
    failedRecipients: [
      { id: 'f-1', phoneMasked: '+251 91* *** 812', channel: 'sms', reason: 'Tower cell congested' },
      { id: 'f-2', phoneMasked: '+251 92* *** 404', channel: 'sms', reason: 'Device unreachable / roaming' },
      { id: 'f-3', phoneMasked: '+251 93* *** 119', channel: 'voice', reason: 'Subscriber busy' },
    ],
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:25:00Z',
  },
  {
    id: 'ALT-102',
    caseId: 'ETH-002',
    title: 'Severe Wildfire Air Quality & Evacuation Alert',
    severity: 'high',
    area: 'Oromia - Bale Mountains National Park',
    channels: ['push', 'sms'],
    languages: {
      en: 'HIGH ALERT: Wildfire spreading south of Goba. Stay indoors if respiratory issues. Prepare go-bags for potential evacuation.',
      am: 'ከፍተኛ ማስጠንቀቂያ፡ በጎባ ደቡብ የሰደድ እሳት በመስፋፋቱ የትንፋሽ ችግር ያለባቸው ሰዎች ቤት ውስጥ ይቆዩ።',
    },
    status: 'pending_approval',
    tier1SubmittedBy: {
      id: 'u-008',
      name: 'Tewodros Kassahun (Administrator)',
      timestamp: '2026-10-18T12:00:00Z',
    },
    estimatedCitizens: 84000,
    deliveryProgress: {
      push: { queued: 35000, sent: 0, delivered: 0, failed: 0 },
      sms: { queued: 49000, sent: 0, delivered: 0, failed: 0 },
      voice: { queued: 0, sent: 0, delivered: 0, failed: 0 },
    },
    failedRecipients: [],
    createdAt: '2026-10-18T11:45:00Z',
    updatedAt: '2026-10-18T12:00:00Z',
  },
  {
    id: 'ALT-103',
    caseId: 'ETH-003',
    title: 'Industrial Hazmat Fume Advisory - Akaki Industrial Zone',
    severity: 'critical',
    area: 'Addis Ababa - Akaky Kaliti',
    channels: ['push', 'sms'],
    languages: {
      en: 'CRITICAL: Hazardous chemical vapor plume detected in Akaki Industrial Zone. Close all windows and shut off air ventilation.',
      am: 'አደገኛ፡ በአቃቂ ኢንዱስትሪ ዞን ጎጂ የኬሚካል ጭስ በመሰራጨቱ መስኮቶችን ይዝጉና የአየር ማናፈሻዎችን ያጥፉ።',
    },
    status: 'approved',
    tier1SubmittedBy: {
      id: 'u-008',
      name: 'Tewodros Kassahun (Administrator)',
      timestamp: '2026-10-18T13:00:00Z',
    },
    tier2ApprovedBy: {
      id: 'u-004',
      name: 'Hanna Bekele (Higher Officer)',
      timestamp: '2026-10-18T13:08:00Z',
      signatureHash: 'sig_ed25519_55ba8901cc',
    },
    estimatedCitizens: 110000,
    deliveryProgress: {
      push: { queued: 50000, sent: 0, delivered: 0, failed: 0 },
      sms: { queued: 60000, sent: 0, delivered: 0, failed: 0 },
      voice: { queued: 0, sent: 0, delivered: 0, failed: 0 },
    },
    failedRecipients: [],
    createdAt: '2026-10-18T12:45:00Z',
    updatedAt: '2026-10-18T13:08:00Z',
  },
]

export async function fetchAlerts(): Promise<Alert[]> {
  await delay()
  return JSON.parse(JSON.stringify(alertsStore))
}

export async function fetchAlert(id: string): Promise<Alert | null> {
  await delay()
  const found = alertsStore.find((a) => a.id === id)
  return found ? JSON.parse(JSON.stringify(found)) : null
}

export async function createAlertDraft(input: Partial<Alert>, _user: User): Promise<Alert> {
  await delay()
  const newAlert: Alert = {
    id: `ALT-${Date.now().toString().slice(-4)}`,
    title: input.title || 'Untitled Emergency Alert',
    severity: input.severity || 'medium',
    area: input.area || 'Addis Ababa Metro',
    channels: input.channels || ['push', 'sms'],
    languages: input.languages || { en: '', am: '' },
    status: 'draft',
    estimatedCitizens: input.estimatedCitizens || 50000,
    deliveryProgress: {
      push: { queued: 0, sent: 0, delivered: 0, failed: 0 },
      sms: { queued: 0, sent: 0, delivered: 0, failed: 0 },
      voice: { queued: 0, sent: 0, delivered: 0, failed: 0 },
    },
    failedRecipients: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  alertsStore.unshift(newAlert)
  emitMockEvent({ type: 'case_changed', caseId: newAlert.id, status: 'draft' })
  return newAlert
}

export async function submitTier1(id: string, user: User): Promise<Alert> {
  await delay()
  const alert = alertsStore.find((a) => a.id === id)
  if (!alert) throw new Error('Alert not found')

  alert.status = 'pending_approval'
  alert.tier1SubmittedBy = {
    id: user.id,
    name: `${user.fullName} (${user.role})`,
    timestamp: new Date().toISOString(),
  }
  alert.updatedAt = new Date().toISOString()
  emitMockEvent({ type: 'case_changed', caseId: id, status: 'submitted' })
  return JSON.parse(JSON.stringify(alert))
}

export async function approveTier2(id: string, user: User, code: string): Promise<Alert> {
  await delay()
  if (code !== '123456') {
    throw new Error('Invalid digital signature 2FA code.')
  }

  const alert = alertsStore.find((a) => a.id === id)
  if (!alert) throw new Error('Alert not found')

  // HARD RULE ENFORCED: Mutual exclusion between Tier 1 and Tier 2
  if (alert.tier1SubmittedBy && alert.tier1SubmittedBy.id === user.id) {
    const error: any = new Error('HARD SECURITY RULE: The same official who submitted Tier-1 approval cannot act as the Tier-2 approver.')
    error.status = 403
    throw error
  }

  alert.status = 'approved'
  alert.tier2ApprovedBy = {
    id: user.id,
    name: `${user.fullName} (Higher Officer)`,
    timestamp: new Date().toISOString(),
    signatureHash: `sig_ed25519_${Math.random().toString(36).substr(2, 9)}`,
  }
  alert.updatedAt = new Date().toISOString()
  emitMockEvent({ type: 'case_changed', caseId: id, status: 'approved' })
  return JSON.parse(JSON.stringify(alert))
}

export async function emergencyFastTrack(id: string, user: User, reason: string): Promise<Alert> {
  await delay()
  const alert = alertsStore.find((a) => a.id === id)
  if (!alert) throw new Error('Alert not found')

  if (alert.severity !== 'critical') {
    throw new Error('Fast-track approval is restricted exclusively to CRITICAL severity alerts.')
  }

  if (reason.trim().length < 20) {
    throw new Error('A detailed written justification (minimum 20 characters) is required for audit logs.')
  }

  alert.status = 'approved'
  alert.isFastTrack = true
  alert.fastTrackReason = reason
  alert.tier2ApprovedBy = {
    id: user.id,
    name: `${user.fullName} (EMERGENCY FAST-TRACK)`,
    timestamp: new Date().toISOString(),
    signatureHash: `fast_track_${Math.random().toString(36).substr(2, 8)}`,
  }
  alert.updatedAt = new Date().toISOString()
  emitMockEvent({ type: 'case_changed', caseId: id, status: 'approved' })
  return JSON.parse(JSON.stringify(alert))
}

export async function dispatchAlert(id: string): Promise<Alert> {
  await delay()
  const alert = alertsStore.find((a) => a.id === id)
  if (!alert) throw new Error('Alert not found')

  if (alert.status !== 'approved') {
    throw new Error('One-click dispatch is strictly prohibited until full digital signature is secured.')
  }

  alert.status = 'broadcasting'
  alert.updatedAt = new Date().toISOString()

  // Initialize simulated delivery numbers
  alert.channels.forEach((ch) => {
    const target = Math.round(alert.estimatedCitizens * (ch === 'sms' ? 0.6 : ch === 'push' ? 0.35 : 0.05))
    alert.deliveryProgress[ch] = {
      queued: Math.round(target * 0.1),
      sent: Math.round(target * 0.9),
      delivered: Math.round(target * 0.85),
      failed: Math.round(target * 0.05),
    }
  })

  emitMockEvent({ type: 'case_changed', caseId: id, status: 'broadcast' })
  return JSON.parse(JSON.stringify(alert))
}

export async function retryFailedRecipients(alertId: string): Promise<void> {
  await delay(600)
  const alert = alertsStore.find((a) => a.id === alertId)
  if (alert) {
    alert.failedRecipients = []
    emitMockEvent({ type: 'case_changed', caseId: alertId, status: alert.status === 'broadcasting' ? 'broadcast' : 'verified' })
  }
}
