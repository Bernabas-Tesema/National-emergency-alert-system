
import type { AreaSelection } from './area'

// The 8 case statuses from the Resource Organization Portal plan.
export const CASE_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'needs_clarification',
  'verified',
  'approved',
  'broadcast',
  'rejected',
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  needs_clarification: 'Needs clarification',
  verified: 'Verified',
  approved: 'Approved',
  broadcast: 'Broadcast',
  rejected: 'Rejected',
}

// Minimal case record used by the application for now.
export interface Case {
  id: string
  title: string
  category: string
  area: string
  status: CaseStatus
  updatedAt: string
}

export const CASE_CATEGORIES = [
  'fire',
  'flood_weather',
  'accident',
  'health_disease',
  'missing_person',
  'hazard',
  'security_conflict',
  'other',
] as const

export type CaseCategory = (typeof CASE_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<CaseCategory, string> = {
  fire: 'Fire',
  flood_weather: 'Flood or weather',
  accident: 'Accident',
  health_disease: 'Health or disease',
  missing_person: 'Missing person',
  hazard: 'Hazard (gas leak, chemical, collapse)',
  security_conflict: 'Security or conflict',
  other: 'Other',
}

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export type Severity = (typeof SEVERITIES)[number]

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

// Everything the case form collects. '' means "not chosen yet".
export interface CaseFormValues {
  title: string
  category: CaseCategory | ''
  severity: Severity | ''
  area: AreaSelection
  startTime: string // The value of a datetime-local input
  description: string
  recommendedAction: string
  files: File[]
}
