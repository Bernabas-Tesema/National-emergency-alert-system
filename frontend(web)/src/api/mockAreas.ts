import type { Area, NewAreaInput } from '@/types/settings'
import { SettingsError } from './mockSettings'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// PLACEHOLDER DATA. Replace with the official list of regions, zones and
// sub-cities from the backend or the National ID registry.
const SUBCITIES = [
  'Addis Ketema',
  'Akaky Kaliti',
  'Arada',
  'Bole',
  'Gulele',
  'Kirkos',
  'Kality',
  'Lideta',
  'Nifas Silk-Lafto',
  'Yeka',
]

const areas: Area[] = [
  { id: 'reg-aa', name: 'Addis Ababa', kind: 'region', parentId: null, enabled: true },
  { id: 'reg-or', name: 'Oromia', kind: 'region', parentId: null, enabled: false },
  ...SUBCITIES.map(
    (name, i): Area => ({
      id: `sub-${i + 1}`,
      name,
      kind: 'subcity',
      parentId: 'reg-aa',
      enabled: true,
    }),
  ),
  { id: 'zone-1', name: 'East Shewa', kind: 'zone', parentId: 'reg-or', enabled: false },
  { id: 'zone-2', name: 'West Shewa', kind: 'zone', parentId: 'reg-or', enabled: false },
]

// Regions first (A to Z), each followed by the areas inside it (A to Z).
function ordered(list: Area[]): Area[] {
  const byName = (a: Area, b: Area) => a.name.localeCompare(b.name)
  const regions = list.filter((a) => a.kind === 'region').sort(byName)
  return regions.flatMap((region) => [
    region,
    ...list.filter((a) => a.parentId === region.id).sort(byName),
  ])
}

function find(id: string): Area {
  const found = areas.find((a) => a.id === id)
  if (!found) throw new SettingsError('Area not found.')
  return found
}

function checkName(raw: string): string {
  const name = raw.trim()
  if (name.length < 2 || name.length > 60) {
    throw new SettingsError('The name must be 2 to 60 characters.')
  }
  return name
}

// Two areas inside the same parent cannot share a name.
function assertNameFree(name: string, parentId: string | null, exceptId: string | null) {
  const taken = areas.some(
    (a) =>
      a.id !== exceptId &&
      a.parentId === parentId &&
      a.name.toLowerCase() === name.toLowerCase(),
  )
  if (taken) throw new SettingsError('An area with that name already exists here.')
}

// --- Functions the screens call. Each returns the full, updated list. ----
// Later each becomes a real request. The server must repeat every check and
// write each change to the audit log.

export async function fetchAreas(): Promise<Area[]> {
  await delay()
  return clone(ordered(areas))
}

let nextAreaNumber = 100

export async function createArea(input: NewAreaInput): Promise<Area[]> {
  await delay()
  const name = checkName(input.name)
  if (input.kind === 'region') {
    if (input.parentId !== null) throw new SettingsError('A region has no parent.')
  } else {
    const parent = areas.find((a) => a.id === input.parentId)
    if (!parent || parent.kind !== 'region') {
      throw new SettingsError('Choose the region this area belongs to.')
    }
    if (!parent.enabled) {
      throw new SettingsError(`${parent.name} is turned off. Turn it on first.`)
    }
  }
  assertNameFree(name, input.parentId, null)
  areas.push({
    id: `area-${nextAreaNumber++}`,
    name,
    kind: input.kind,
    parentId: input.parentId,
    enabled: true,
  })
  return clone(ordered(areas))
}

export async function renameArea(id: string, rawName: string): Promise<Area[]> {
  await delay(250)
  const target = find(id)
  const name = checkName(rawName)
  assertNameFree(name, target.parentId, id)
  target.name = name
  return clone(ordered(areas))
}

export async function setAreaEnabled(id: string, enabled: boolean): Promise<Area[]> {
  await delay(250)
  const target = find(id)
  if (enabled && target.parentId) {
    const parent = areas.find((a) => a.id === target.parentId)
    if (parent && !parent.enabled) {
      throw new SettingsError(`Turn on ${parent.name} first.`)
    }
  }
  target.enabled = enabled
  // Turning a region off turns off everything inside it.
  if (!enabled && target.kind === 'region') {
    areas.forEach((a) => {
      if (a.parentId === target.id) a.enabled = false
    })
  }
  return clone(ordered(areas))
}