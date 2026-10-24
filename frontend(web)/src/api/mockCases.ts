
import { getRegion } from '@/lib/regions'
import { isAreaSelected } from '@/lib/area'
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
  type DeliveryChannelStats,
  type InsaDecision,
  type Severity,
} from '@/types/case'
import type { Message } from '@/types/message'
import type { User } from '@/types/user'
import { emitMockEvent } from './mockRealtimeBus'
import { liveApi } from './config'
import {
  liveFetchCase,
  liveFetchCases,
  liveRejectCase,
  liveRequestCaseUpdate,
  liveRequestClarification,
  liveResubmitCase,
  liveSaveCase,
  liveSendCaseMessage,
  liveUpdateDraft,
  liveVerifyCase,
} from './liveCases'

const delay = (ms = 400) =>
  new Promise((resolve) => setTimeout(resolve, ms))

const today = () => new Date().toISOString().slice(0, 10)

// --- Sample data (all invented, including names and numbers) ------------

interface Seed {
  id: string
  title: string
  categoryId: CaseCategory
  severity: Severity
  regionId: string
  status: CaseStatus
  updatedAt: string
  startTime: string
  description: string
  recommendedAction: string
  messages?: Message[]
  decision?: InsaDecision
  delivery?: DeliveryChannelStats[]
}

function fromSeed(s: Seed): CaseRecord {
  return {
    id: s.id,
    title: s.title,
    category: CATEGORY_LABELS[s.categoryId],
    area: getRegion(s.regionId)?.name ?? 'Unknown',
    status: s.status,
    updatedAt: s.updatedAt,
    categoryId: s.categoryId,
    severity: s.severity,
    areaSelection: { regionId: s.regionId, points: [] },
    startTime: s.startTime,
    description: s.description,
    recommendedAction: s.recommendedAction,
    attachmentNames: [],
    messages: s.messages ?? [],
    decision: s.decision ?? null,
    delivery: s.delivery ?? null,
    updates: [],
  }
}

const MOCK_CASES: CaseRecord[] = (
  [
    {
      id: 'CASE-1001',
      title: 'Flash flood risk along Kebena river',
      categoryId: 'flood_weather',
      severity: 'HIGH',
      regionId: 'bole',
      status: 'broadcast',
      updatedAt: '2026-10-14',
      startTime: '2026-10-14T06:30',
      description: 'River level rising quickly after heavy overnight rain.',
      recommendedAction:
        'Move away from riverbanks and low-lying areas.',
      decision: {
        outcome: 'approved',
        decidedBy: 'Hanna Bekele',
        decidedAt: '2026-10-14T07:10:00Z',
        comment: 'Verified with the river authority readings.',
      },
      delivery: [
        { channel: 'PUSH', sent: 12000, delivered: 11450, failed: 550 },
        { channel: 'SMS', sent: 15000, delivered: 14200, failed: 800 },
        { channel: 'VOICE', sent: 2000, delivered: 1700, failed: 300 },
      ],
    },
    {
      id: 'CASE-1002',
      title: 'Warehouse fire near main road',
      categoryId: 'fire',
      severity: 'HIGH',
      regionId: 'kality',
      status: 'under_review',
      updatedAt: '2026-10-15',
      startTime: '2026-10-15T14:10',
      description: 'Large warehouse fire with smoke visible from far away.',
      recommendedAction: 'Avoid the main road and keep windows closed.',
    },
    {
      id: 'CASE-1003',
      title: 'Suspected disease outbreak in school',
      categoryId: 'health_disease',
      severity: 'MEDIUM',
      regionId: 'yeka',
      status: 'needs_clarification',
      updatedAt: '2026-10-15',
      startTime: '2026-10-15T09:00',
      description: 'Several students report similar symptoms since Monday.',
      recommendedAction: 'Parents should keep sick children at home.',
      messages: [
        {
          id: 'm-seed-1',
          authorId: 'u-006',
          authorName: 'Marta Haile',
          authorRole: 'system_admin',
          text: 'Which school is this, and how many students are affected?',
          sentAt: '2026-10-15T11:20:00Z',
        },
      ],
    },
    {
      id: 'CASE-1004',
      title: 'Road closure after multi-vehicle crash',
      categoryId: 'accident',
      severity: 'MEDIUM',
      regionId: 'arada',
      status: 'approved',
      updatedAt: '2026-10-13',
      startTime: '2026-10-13T17:45',
      description: 'Crash blocking both lanes, traffic backed up.',
      recommendedAction: 'Use alternative routes until further notice.',
      decision: {
        outcome: 'approved',
        decidedBy: 'Hanna Bekele',
        decidedAt: '2026-10-13T19:00:00Z',
        comment: 'Confirmed with traffic police.',
      },
    },
    {
      id: 'CASE-1005',
      title: 'Gas leak near market',
      categoryId: 'hazard',
      severity: 'HIGH',
      regionId: 'lideta',
      status: 'draft',
      updatedAt: '2026-10-16',
      startTime: '2026-10-16T08:15',
      description: 'Smell of gas reported by several shop owners.',
      recommendedAction: '',
    },
    {
      id: 'CASE-1006',
      title: 'Unverified rumour of dam failure',
      categoryId: 'flood_weather',
      severity: 'LOW',
      regionId: 'gulele',
      status: 'rejected',
      updatedAt: '2026-10-12',
      startTime: '2026-10-12T10:00',
      description:
        'Social media reports with no confirmation from authorities.',
      recommendedAction: '',
      decision: {
        outcome: 'rejected',
        decidedBy: 'Marta Haile',
        decidedAt: '2026-10-12T12:30:00Z',
        comment: 'No confirmation from the dam authority.',
      },
    },
  ] satisfies Seed[]
).map(fromSeed)

// --- SIMULATION ONLY ------------------------------------------------------
// Pretends INSA reviews a case after it is submitted, so we can see live
// updates. Remove when the real backend and WebSocket exist.

const after = (seconds: number, action: () => void) =>
  setTimeout(action, seconds * 1000)

function changeStatus(found: CaseRecord, status: CaseStatus) {
  found.status = status
  found.updatedAt = today()
  emitMockEvent({
    type: 'case_changed',
    caseId: found.id,
    status,
  })
}

// 'ask': INSA starts reviewing, then asks a question.
// 'approve': INSA reviews, approves, and the alert is broadcast.
function simulateInsaReview(
  caseId: string,
  outcome: 'ask' | 'approve',
) {
  // Only act if the case is still in the state we expect.
  const inState = (expected: CaseStatus) => {
    const found = MOCK_CASES.find((c) => c.id === caseId)
    return found && found.status === expected ? found : null
  }

  after(5, () => {
    const found = inState('submitted')
    if (found) changeStatus(found, 'under_review')
  })

  if (outcome === 'ask') {
    after(12, () => {
      const found = inState('under_review')
      if (!found) return

      const message: Message = {
        id: crypto.randomUUID(),
        authorId: 'u-006',
        authorName: 'Marta Haile',
        authorRole: 'system_admin',
        text:
          'Please confirm how many people are affected and whether emergency services are on site.',
        sentAt: new Date().toISOString(),
      }

      found.messages.push(message)

      emitMockEvent({
        type: 'case_message',
        caseId,
        authorId: message.authorId,
        authorName: message.authorName,
      })

      changeStatus(found, 'needs_clarification')
    })
  } else {
    after(10, () => {
      const found = inState('under_review')
      if (!found) return

      found.decision = {
        outcome: 'approved',
        decidedBy: 'Hanna Bekele',
        decidedAt: new Date().toISOString(),
        comment: 'Information confirmed. Approved for broadcast.',
      }

      changeStatus(found, 'approved')
    })

    after(16, () => {
      const found = inState('approved')
      if (!found) return

      found.delivery = [
        { channel: 'PUSH', sent: 8000, delivered: 7600, failed: 400 },
        { channel: 'SMS', sent: 10000, delivered: 9500, failed: 500 },
        { channel: 'VOICE', sent: 1500, delivered: 1250, failed: 250 },
      ]

      changeStatus(found, 'broadcast')
    })
  }
}

// --- Functions the screens call ----------------------------------------
// Later each of these becomes a real request to the backend.

export async function fetchCases(): Promise<Case[]> {
  if (liveApi) return liveFetchCases()
  await delay()
  return [...MOCK_CASES]
}

// Returns null when the id does not exist.
export async function fetchCase(
  id: string,
): Promise<CaseRecord | null> {
  if (liveApi) return liveFetchCase(id)
  await delay()

  const found = MOCK_CASES.find((c) => c.id === id)

  return found
    ? {
        ...found,
        messages: [...found.messages],
        updates: [...found.updates],
      }
    : null
}

let nextCaseNumber = 1007

function describeArea(area: AreaSelection): string {
  if (!isAreaSelected(area)) return 'Not set'

  const region = getRegion(area.regionId)

  if (region && area.points.length >= 3) {
    return `${region.name} + drawn area`
  }

  if (region) return region.name

  return 'Drawn area'
}

function categoryLabel(
  category: CaseFormValues['category'],
): string {
  return category ? CATEGORY_LABELS[category] : 'Uncategorised'
}

// Saves a new case as a draft or submits it. The list lives only in memory,
// so it resets when you refresh. The real backend will receive the files as
// an upload; here we only keep their names.
export async function saveCase(
  values: CaseFormValues,
  status: Extract<CaseStatus, 'draft' | 'submitted'>,
): Promise<Case> {
  if (liveApi) return liveSaveCase(values, status)
  await delay()

  const saved: CaseRecord = {
    id: `CASE-${nextCaseNumber++}`,
    title: values.title.trim(),
    category: categoryLabel(values.category),
    area: describeArea(values.area),
    status,
    updatedAt: today(),
    categoryId: values.category,
    severity: values.severity,
    areaSelection: values.area,
    startTime: values.startTime,
    description: values.description.trim(),
    recommendedAction: values.recommendedAction.trim(),
    attachmentNames: values.files.map((f) => f.name),
    messages: [],
    decision: null,
    delivery: null,
    updates: [],
  }

  MOCK_CASES.unshift(saved)

  if (status === 'submitted') {
    simulateInsaReview(saved.id, 'ask')
  }

  return saved
}

// Edits a draft, and can submit it at the same time. Only drafts can change.
// New files are added to the ones already attached.
export async function updateDraft(
  id: string,
  values: CaseFormValues,
  status: Extract<CaseStatus, 'draft' | 'submitted'>,
): Promise<void> {
  if (liveApi) return liveUpdateDraft(id, values, status)
  await delay()

  const found = MOCK_CASES.find((c) => c.id === id)

  if (!found) throw new Error('Case not found')
  if (found.status !== 'draft') {
    throw new Error('Only drafts can be edited')
  }

  found.title = values.title.trim()
  found.category = categoryLabel(values.category)
  found.categoryId = values.category
  found.severity = values.severity
  found.area = describeArea(values.area)
  found.areaSelection = values.area
  found.startTime = values.startTime
  found.description = values.description.trim()
  found.recommendedAction = values.recommendedAction.trim()
  found.attachmentNames = [
    ...found.attachmentNames,
    ...values.files.map((f) => f.name),
  ]

  found.status = status
  found.updatedAt = today()

  if (status === 'submitted') {
    simulateInsaReview(found.id, 'ask')
  }
}

// After answering INSA's question, the officer sends the case back for review.
export async function resubmitCase(
  caseId: string,
): Promise<void> {
  if (liveApi) return liveResubmitCase(caseId)
  await delay(250)

  const found = MOCK_CASES.find((c) => c.id === caseId)

  if (!found) throw new Error('Case not found')

  if (found.status !== 'needs_clarification') {
    throw new Error(
      'Only cases that need clarification can be resubmitted',
    )
  }

  found.status = 'submitted'
  found.updatedAt = today()

  simulateInsaReview(found.id, 'approve')
}

// The author and time are filled in here, the way a real server would do it,
// so the browser can never pretend to be someone else.
export async function sendCaseMessage(
  caseId: string,
  author: User,
  text: string,
): Promise<Message> {
  if (liveApi) return liveSendCaseMessage(caseId, author, text)
  await delay(250)

  const found = MOCK_CASES.find((c) => c.id === caseId)

  if (!found) throw new Error('Case not found')

  const message: Message = {
    id: crypto.randomUUID(),
    authorId: author.id,
    authorName: author.fullName,
    authorRole: author.role,
    text,
    sentAt: new Date().toISOString(),
  }

  found.messages.push(message)

  return message
}

// Asks INSA to publish an update or an "all clear" for an active alert.
// It is only a request: INSA must approve it before the public sees it.
export async function requestCaseUpdate(
  caseId: string,
  kind: CaseUpdateKind,
  text: string,
  author: User,
): Promise<CaseUpdate> {
  if (liveApi) return liveRequestCaseUpdate(caseId, kind, text, author)
  await delay(250)

  const found = MOCK_CASES.find((c) => c.id === caseId)

  if (!found) throw new Error('Case not found')

  if (found.status !== 'broadcast') {
    throw new Error(
      'Updates can only be requested for broadcast cases',
    )
  }

  const update: CaseUpdate = {
    id: crypto.randomUUID(),
    kind,
    text,
    requestedBy: author.fullName,
    requestedAt: new Date().toISOString(),
  }

  found.updates.push(update)

  return update
}

export async function verifyCase(caseId: string, _author: User): Promise<void> {
  if (liveApi) return liveVerifyCase(caseId)
  await delay(250)
  const found = MOCK_CASES.find((c) => c.id === caseId)
  if (!found) throw new Error('Case not found')
  found.status = 'verified'
  found.updatedAt = today()
  emitMockEvent({ type: 'case_changed', caseId, status: 'verified' })
}

export async function rejectCase(caseId: string, author: User, reason: string): Promise<void> {
  if (liveApi) return liveRejectCase(caseId, reason)
  await delay(250)
  const found = MOCK_CASES.find((c) => c.id === caseId)
  if (!found) throw new Error('Case not found')
  found.status = 'rejected'
  found.updatedAt = today()
  found.decision = {
    outcome: 'rejected',
    decidedBy: author.fullName,
    decidedAt: new Date().toISOString(),
    comment: reason,
  }
  emitMockEvent({ type: 'case_changed', caseId, status: 'rejected' })
}

export async function requestCaseClarification(caseId: string, author: User, question: string): Promise<void> {
  if (liveApi) return liveRequestClarification(caseId, question)
  await delay(250)
  const found = MOCK_CASES.find((c) => c.id === caseId)
  if (!found) throw new Error('Case not found')
  found.status = 'needs_clarification'
  found.updatedAt = today()
  found.messages.push({
    id: crypto.randomUUID(),
    authorId: author.id,
    authorName: author.fullName,
    authorRole: author.role,
    text: question,
    sentAt: new Date().toISOString(),
  })
  emitMockEvent({ type: 'case_changed', caseId, status: 'needs_clarification' })
}

