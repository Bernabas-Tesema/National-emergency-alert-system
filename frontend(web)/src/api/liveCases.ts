import { getRegion, REGIONS } from '@/lib/regions'
import type { AreaSelection } from '@/types/area'
import {
  CATEGORY_LABELS,
  type Case,
  type CaseCategory,
  type CaseFormValues,
  type CaseRecord,
  type CaseStatus,
  type CaseUpdate,
  type CaseUpdateKind,
  type Severity,
} from '@/types/case'
import type { Message } from '@/types/message'
import type { User } from '@/types/user'
import { apiFetch } from './client'

interface ApiCase {
  id: number
  status: string
  case_type: string
  severity: string
  region: string
  created_at: string
  title: string
  description: string
  organization: string | null
  latitude: number | null
  longitude: number | null
  review_comment: string | null
  created_by: string | null
}

const CATEGORY_TO_API: Record<string, string> = {
  fire: 'fire',
  flood_weather: 'flood',
  accident: 'accident',
  health_disease: 'health',
  missing_person: 'missing_person',
  hazard: 'other',
  security_conflict: 'other',
  other: 'other',
}

const API_TO_CATEGORY: Record<string, CaseCategory> = {
  fire: 'fire',
  flood: 'flood_weather',
  accident: 'accident',
  health: 'health_disease',
  missing_person: 'missing_person',
  other: 'other',
}

const SEVERITY_TO_API: Record<string, string> = {
  LOW: 'information',
  MEDIUM: 'warning',
  HIGH: 'critical',
  CRITICAL: 'critical',
}

const API_TO_SEVERITY: Record<string, Severity> = {
  information: 'LOW',
  warning: 'MEDIUM',
  critical: 'CRITICAL',
}

const API_TO_STATUS: Record<string, CaseStatus> = {
  submitted: 'submitted',
  new: 'submitted',
  verified: 'verified',
  rejected: 'rejected',
  clarification_requested: 'needs_clarification',
}

const localDrafts: CaseRecord[] = []
const localMessages = new Map<string, Message[]>()
const localUpdates = new Map<string, CaseUpdate[]>()
let draftNumber = 1

function signedInUser(): User | null {
  try {
    const raw = sessionStorage.getItem('ness-mock-user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function regionName(area: AreaSelection): string {
  if (area.regionId) return getRegion(area.regionId)?.name ?? area.regionId
  return 'Addis Ababa'
}

function regionIdFromName(name: string): string | null {
  return REGIONS.find((region) => region.name === name)?.id ?? null
}

function splitDescription(description: string): { body: string; action: string } {
  const marker = '\n\nRecommended action: '
  const index = description.indexOf(marker)
  if (index === -1) return { body: description, action: '' }
  return {
    body: description.slice(0, index),
    action: description.slice(index + marker.length),
  }
}

function toRecord(api: ApiCase): CaseRecord {
  const categoryId = API_TO_CATEGORY[api.case_type] ?? 'other'
  const { body, action } = splitDescription(api.description)
  const id = String(api.id)
  const points: AreaSelection['points'] =
    api.latitude != null && api.longitude != null ? [[api.latitude, api.longitude]] : []
  const status = API_TO_STATUS[api.status] ?? 'submitted'
  const comment = api.review_comment ?? ''
  const messages = [...(localMessages.get(id) ?? [])]
  if (status === 'needs_clarification' && comment) {
    messages.unshift({
      id: `review-${id}`,
      authorId: 'insa',
      authorName: 'INSA',
      authorRole: 'ADMINISTRATOR',
      text: comment,
      sentAt: api.created_at,
    })
  }
  return {
    id,
    title: api.title || body.slice(0, 120),
    category: CATEGORY_LABELS[categoryId],
    area: api.region,
    status,
    updatedAt: api.created_at.slice(0, 10),
    severity: API_TO_SEVERITY[api.severity] ?? '',
    categoryId,
    areaSelection: { regionId: regionIdFromName(api.region), points },
    startTime: api.created_at.slice(0, 16),
    description: body,
    recommendedAction: action,
    attachmentNames: [],
    messages,
    decision:
      status === 'rejected'
        ? {
            outcome: 'rejected',
            decidedBy: 'INSA',
            decidedAt: api.created_at,
            comment,
          }
        : null,
    delivery: null,
    updates: [...(localUpdates.get(id) ?? [])],
  }
}

export async function liveFetchCases(): Promise<Case[]> {
  const rows = await apiFetch<ApiCase[]>('/api/v1/cases')
  return [...localDrafts, ...rows.map(toRecord)]
}

export async function liveFetchCase(id: string): Promise<CaseRecord | null> {
  const draft = localDrafts.find((item) => item.id === id)
  if (draft) return { ...draft, messages: [...draft.messages], updates: [...draft.updates] }
  if (!/^\d+$/.test(id)) return null
  try {
    const row = await apiFetch<ApiCase>(`/api/v1/cases/${id}`)
    return toRecord(row)
  } catch {
    return null
  }
}

function remember(record: CaseRecord) {
  localDrafts.unshift(record)
}

export async function liveSaveCase(
  values: CaseFormValues,
  status: Extract<CaseStatus, 'draft' | 'submitted'>,
): Promise<Case> {
  if (status === 'draft') {
    const saved: CaseRecord = {
      id: `DRAFT-${draftNumber++}`,
      title: values.title.trim(),
      category: values.category ? CATEGORY_LABELS[values.category] : 'Uncategorised',
      area: regionName(values.area),
      status: 'draft',
      updatedAt: new Date().toISOString().slice(0, 10),
      categoryId: values.category,
      severity: values.severity,
      areaSelection: values.area,
      startTime: values.startTime,
      description: values.description.trim(),
      recommendedAction: values.recommendedAction.trim(),
      attachmentNames: values.files.map((file) => file.name),
      messages: [],
      decision: null,
      delivery: null,
      updates: [],
    }
    remember(saved)
    return saved
  }

  const point = values.area.points[0]
  const created = await apiFetch<ApiCase>('/api/v1/cases', {
    method: 'POST',
    body: JSON.stringify({
      title: values.title.trim(),
      case_type: CATEGORY_TO_API[values.category] ?? 'other',
      severity: SEVERITY_TO_API[values.severity] ?? 'warning',
      description: `${values.description.trim()}\n\nRecommended action: ${values.recommendedAction.trim()}`,
      region: regionName(values.area),
      latitude: point?.[0] ?? null,
      longitude: point?.[1] ?? null,
      organization: signedInUser()?.organization ?? null,
    }),
  })
  return toRecord(created)
}

export async function liveUpdateDraft(
  id: string,
  values: CaseFormValues,
  status: Extract<CaseStatus, 'draft' | 'submitted'>,
): Promise<void> {
  const found = localDrafts.find((item) => item.id === id)
  if (!found) throw new Error('Only drafts saved in this browser can be edited')
  if (found.status !== 'draft') throw new Error('Only drafts can be edited')
  found.title = values.title.trim()
  found.category = values.category ? CATEGORY_LABELS[values.category] : 'Uncategorised'
  found.categoryId = values.category
  found.severity = values.severity
  found.area = regionName(values.area)
  found.areaSelection = values.area
  found.startTime = values.startTime
  found.description = values.description.trim()
  found.recommendedAction = values.recommendedAction.trim()
  found.attachmentNames = [...found.attachmentNames, ...values.files.map((file) => file.name)]
  found.updatedAt = new Date().toISOString().slice(0, 10)
  if (status === 'submitted') {
    const index = localDrafts.findIndex((item) => item.id === id)
    if (index >= 0) localDrafts.splice(index, 1)
    await liveSaveCase(values, 'submitted')
  }
}

export async function liveResubmitCase(caseId: string): Promise<void> {
  await apiFetch(`/api/v1/cases/${caseId}/resubmit`, { method: 'POST' })
}

export async function liveSendCaseMessage(
  caseId: string,
  author: User,
  text: string,
): Promise<Message> {
  const message: Message = {
    id: crypto.randomUUID(),
    authorId: author.id,
    authorName: author.fullName,
    authorRole: author.role,
    text,
    sentAt: new Date().toISOString(),
  }
  const existing = localMessages.get(caseId) ?? []
  existing.push(message)
  localMessages.set(caseId, existing)
  return message
}

export async function liveRequestCaseUpdate(
  caseId: string,
  kind: CaseUpdateKind,
  text: string,
  author: User,
): Promise<CaseUpdate> {
  const current = await liveFetchCase(caseId)
  if (!current) throw new Error('Case not found')
  if (current.status !== 'broadcast') {
    throw new Error('Updates can only be requested for broadcast cases')
  }
  const update: CaseUpdate = {
    id: crypto.randomUUID(),
    kind,
    text,
    requestedBy: author.fullName,
    requestedAt: new Date().toISOString(),
  }
  const existing = localUpdates.get(caseId) ?? []
  existing.push(update)
  localUpdates.set(caseId, existing)
  return update
}

async function review(caseId: string, decision: 'verify' | 'reject' | 'clarification', comment: string) {
  await apiFetch(`/api/v1/cases/${caseId}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision, comment }),
  })
}

export async function liveVerifyCase(caseId: string): Promise<void> {
  await review(caseId, 'verify', 'Verified from the operations console.')
}

export async function liveRejectCase(caseId: string, reason: string): Promise<void> {
  await review(caseId, 'reject', reason)
}

export async function liveRequestClarification(caseId: string, question: string): Promise<void> {
  await review(caseId, 'clarification', question)
}
