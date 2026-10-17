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
  type Severity,
} from '@/types/case'
import type { Message } from '@/types/message'
import type { User } from '@/types/user'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

// --- Sample data -------------------------------------------------------

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
      recommendedAction: 'Move away from riverbanks and low-lying areas.',
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
      description: 'Social media reports with no confirmation from authorities.',
      recommendedAction: '',
    },
  ] satisfies Seed[]
).map(fromSeed)

// --- Functions the screens call ----------------------------------------
// Later each of these becomes a real request to the backend.

export async function fetchCases(): Promise<Case[]> {
  await delay()
  return [...MOCK_CASES]
}

// Returns null when the id does not exist.
export async function fetchCase(id: string): Promise<CaseRecord | null> {
  await delay()
  const found = MOCK_CASES.find((c) => c.id === id)
  return found ? { ...found, messages: [...found.messages] } : null
}

let nextCaseNumber = 1007

function describeArea(area: AreaSelection): string {
  if (!isAreaSelected(area)) return 'Not set'
  const region = getRegion(area.regionId)
  if (region && area.points.length >= 3) return `${region.name} + drawn area`
  if (region) return region.name
  return 'Drawn area'
}

// Saves a new case as a draft or submits it. The list lives only in memory,
// so it resets when you refresh. The real backend will receive the files as
// an upload; here we only keep their names.
export async function saveCase(
  values: CaseFormValues,
  status: Extract<CaseStatus, 'draft' | 'submitted'>,
): Promise<Case> {
  await delay()
  const saved: CaseRecord = {
    id: `CASE-${nextCaseNumber++}`,
    title: values.title.trim(),
    category: values.category ? CATEGORY_LABELS[values.category] : 'Uncategorised',
    area: describeArea(values.area),
    status,
    updatedAt: new Date().toISOString().slice(0, 10),
    categoryId: values.category,
    severity: values.severity,
    areaSelection: values.area,
    startTime: values.startTime,
    description: values.description.trim(),
    recommendedAction: values.recommendedAction.trim(),
    attachmentNames: values.files.map((f) => f.name),
    messages: [],
  }
  MOCK_CASES.unshift(saved)
  return saved
}

// The author and time are filled in here, the way a real server would do it,
// so the browser can never pretend to be someone else.
export async function sendCaseMessage(
  caseId: string,
  author: User,
  text: string,
): Promise<Message> {
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