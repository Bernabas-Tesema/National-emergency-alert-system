// ─── Citizen SOS Submission Types ────────────────────────────────────────────

export const SOS_EMERGENCY_TYPES = [
  'accident',
  'fire',
  'flood',
  'landslide',
  'missing_person',
  'health',
  'other',
] as const

export type SosEmergencyType = (typeof SOS_EMERGENCY_TYPES)[number]

export const SOS_TYPE_META: Record<
  SosEmergencyType,
  { label: string; icon: string; color: string; bg: string; description: string }
> = {
  accident: {
    label: 'Accident',
    icon: '🚗',
    color: 'text-orange-400',
    bg: 'bg-orange-950/60 border-orange-800/60',
    description: 'Vehicle crash, industrial accident, collapse',
  },
  fire: {
    label: 'Fire',
    icon: '🔥',
    color: 'text-red-400',
    bg: 'bg-red-950/60 border-red-800/60',
    description: 'Building fire, wildfire, gas explosion',
  },
  flood: {
    label: 'Flood',
    icon: '🌊',
    color: 'text-blue-400',
    bg: 'bg-blue-950/60 border-blue-800/60',
    description: 'Flash flood, waterlogging, dam overflow',
  },
  landslide: {
    label: 'Landslide',
    icon: '⛰️',
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/60 border-yellow-800/60',
    description: 'Soil slide, rockfall, mudslide',
  },
  missing_person: {
    label: 'Missing Person',
    icon: '🔍',
    color: 'text-purple-400',
    bg: 'bg-purple-950/60 border-purple-800/60',
    description: 'Missing child, lost adult, abduction',
  },
  health: {
    label: 'Health Emergency',
    icon: '🏥',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60 border-emerald-800/60',
    description: 'Medical emergency, disease outbreak, poisoning',
  },
  other: {
    label: 'Other',
    icon: '⚠️',
    color: 'text-slate-400',
    bg: 'bg-slate-800/60 border-slate-700/60',
    description: 'Any other emergency requiring immediate help',
  },
}

export type SosStatusTracking = 'received' | 'assigned' | 'in_progress' | 'resolved'

export const SOS_STATUS_STEPS: { key: SosStatusTracking; label: string; desc: string }[] = [
  { key: 'received', label: 'Report Received', desc: 'Your SOS has been logged and is being reviewed.' },
  { key: 'assigned', label: 'Team Assigned', desc: 'A response team has been assigned to your case.' },
  { key: 'in_progress', label: 'Response Underway', desc: 'Emergency responders are on their way.' },
  { key: 'resolved', label: 'Resolved', desc: 'Your emergency has been resolved. Stay safe.' },
]

export interface SosSubmission {
  emergencyType: SosEmergencyType | ''
  description: string
  peopleCount: string
  gpsLat: number | null
  gpsLng: number | null
  gpsAccuracy: number | null
  locationPermitted: boolean
  manualAddress: string
  region: string
  photoFiles: File[]
  photoPreviewUrls: string[]
  shareContact: boolean
  contactName: string
  contactPhone: string
}

export interface SosReport {
  id: string
  trackingCode: string
  emergencyType: SosEmergencyType
  status: SosStatusTracking
  region: string
  description: string
  submittedAt: string
  updatedAt: string
  responderNote?: string
}

export const EMPTY_SOS_SUBMISSION: SosSubmission = {
  emergencyType: '',
  description: '',
  peopleCount: '1',
  gpsLat: null,
  gpsLng: null,
  gpsAccuracy: null,
  locationPermitted: false,
  manualAddress: '',
  region: 'Addis Ababa',
  photoFiles: [],
  photoPreviewUrls: [],
  shareContact: false,
  contactName: '',
  contactPhone: '',
}
