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

// Minimal for now. We add fields (severity, attachments, ...) when we build the case form.
export interface Case {
  id: string
  title: string
  category: string
  area: string
  status: CaseStatus
  updatedAt: string
}