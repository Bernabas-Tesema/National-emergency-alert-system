import { liveApi } from '@/api/config'
import { registerIncomingCitizenSos, type SosType } from '@/api/mockSos'
import type { SosEmergencyType, SosReport, SosStatusTracking } from './types'

// ─── Mock store for SOS reports ──────────────────────────────────────────────
const mockReports: SosReport[] = []

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'SOS-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export interface SosSubmitPayload {
  emergencyType: SosEmergencyType
  description: string
  peopleCount: number
  gpsLat: number | null
  gpsLng: number | null
  region: string
  manualAddress: string
  shareContact: boolean
  contactName: string
  contactPhone: string
  photos?: File[]
}

// ─── Submit a new SOS report ─────────────────────────────────────────────────
export async function submitSosReport(payload: SosSubmitPayload): Promise<SosReport> {
  if (liveApi) {
    const form = new FormData()
    form.append('case_type', payload.emergencyType)
    form.append('description', payload.description)
    form.append('people_count', String(payload.peopleCount))
    form.append('region', payload.region)
    if (payload.gpsLat != null) form.append('latitude', String(payload.gpsLat))
    if (payload.gpsLng != null) form.append('longitude', String(payload.gpsLng))
    if (payload.manualAddress) form.append('manual_address', payload.manualAddress)
    if (payload.shareContact && payload.contactName) form.append('contact_name', payload.contactName)
    if (payload.shareContact && payload.contactPhone) form.append('contact_phone', payload.contactPhone)
    if (payload.photos) {
      payload.photos.forEach((f) => form.append('photos', f))
    }

    const resp = await fetch('/api/v1/sos/submit', {
      method: 'POST',
      body: form,
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to submit SOS report')
    }
    const data = await resp.json()
    // Also notify mock realtime bus for instant admin console alarm
    registerIncomingCitizenSos({
      type: (payload.emergencyType as unknown as SosType) || 'other',
      region: payload.region,
      coordinates: payload.gpsLat != null && payload.gpsLng != null ? [payload.gpsLat, payload.gpsLng] : [9.008, 38.761],
      exactAddress: payload.manualAddress || payload.region,
      peopleCount: `${payload.peopleCount} persons`,
      notes: [payload.description],
      citizenName: payload.contactName,
      citizenPhone: payload.contactPhone,
    })
    return {
      id: String(data.id),
      trackingCode: data.tracking_code || `SOS-${data.id}`,
      emergencyType: payload.emergencyType,
      status: 'received',
      region: payload.region,
      description: payload.description,
      submittedAt: data.created_at || new Date().toISOString(),
      updatedAt: data.created_at || new Date().toISOString(),
    }
  }

  // ── Mock path ──
  await new Promise((r) => setTimeout(r, 900))
  const report: SosReport = {
    id: `mock-${Date.now()}`,
    trackingCode: generateTrackingCode(),
    emergencyType: payload.emergencyType,
    status: 'received',
    region: payload.region,
    description: payload.description,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  mockReports.push(report)

  // Dispatch into mockSos store so INSA admin page receives it in real time
  registerIncomingCitizenSos({
    type: (payload.emergencyType as unknown as SosType) || 'other',
    region: payload.region,
    coordinates: payload.gpsLat != null && payload.gpsLng != null ? [payload.gpsLat, payload.gpsLng] : [9.008, 38.761],
    exactAddress: payload.manualAddress || `${payload.region}, Citizen Location`,
    peopleCount: `${payload.peopleCount} persons`,
    notes: [payload.description],
    citizenName: payload.contactName,
    citizenPhone: payload.contactPhone,
  })

  return report
}

// ─── Track an existing SOS by tracking code ──────────────────────────────────
export async function trackSosReport(trackingCode: string): Promise<SosReport | null> {
  if (liveApi) {
    try {
      const resp = await fetch(`/api/v1/sos/track/${encodeURIComponent(trackingCode)}`)
      if (resp.status === 404) return null
      if (!resp.ok) throw new Error('Tracking lookup failed')
      const data = await resp.json()
      return {
        id: String(data.id),
        trackingCode: data.tracking_code || trackingCode,
        emergencyType: data.case_type,
        status: mapApiStatus(data.status),
        region: data.region,
        description: data.description,
        submittedAt: data.created_at,
        updatedAt: data.updated_at || data.created_at,
        responderNote: data.org_response || undefined,
      }
    } catch {
      return null
    }
  }

  // ── Mock path: simulate status progression ──
  await new Promise((r) => setTimeout(r, 400))
  const report = mockReports.find((r) => r.trackingCode === trackingCode)
  if (!report) return null
  // Simulate status advancing based on time elapsed
  const elapsed = Date.now() - new Date(report.submittedAt).getTime()
  const statuses: SosStatusTracking[] = ['received', 'assigned', 'in_progress', 'resolved']
  const idx = Math.min(Math.floor(elapsed / 15000), 3) // advance every 15s in demo
  report.status = statuses[idx]
  report.updatedAt = new Date().toISOString()
  if (idx >= 1) report.responderNote = 'A response team has been alerted and is coordinating.'
  if (idx >= 2) report.responderNote = 'Responders are en route to your location.'
  if (idx >= 3) report.responderNote = 'Situation assessed and resolved. Thank you for reporting.'
  return { ...report }
}

function mapApiStatus(status: string): SosStatusTracking {
  if (status === 'org_reviewing' || status === 'submitted' || status === 'verified') return 'assigned'
  if (status === 'in_progress') return 'in_progress'
  if (status === 'resolved' || status === 'rejected') return 'resolved'
  return 'received'
}
