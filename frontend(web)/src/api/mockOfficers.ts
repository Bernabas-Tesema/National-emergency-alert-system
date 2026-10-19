import { isValidPhone } from '@/lib/phone'
import type { NewOfficerInput, Officer, OfficerStatus } from '@/types/officer'
import { MOCK_ACCOUNTS } from './mockAccounts'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

// A message that is safe to show to the user.
export class OfficerError extends Error {}

// Invented officers and phone numbers, grouped by organization.
const OFFICERS_BY_ORG: Record<string, Officer[]> = {
  'Addis Ababa Fire & Emergency Authority': [
    {
      id: 'o-001',
      fullName: 'Abebe Kebede',
      username: 'provider1',
      phone: '+251911000001',
      status: 'active',
      lastLoginAt: '2026-10-16T08:05:00Z',
    },
    {
      id: 'o-002',
      fullName: 'Tigist Worku',
      username: 'tigist.w',
      phone: '+251911000002',
      status: 'active',
      lastLoginAt: '2026-10-15T13:40:00Z',
    },
    {
      id: 'o-003',
      fullName: 'Kebede Mamo',
      username: 'kebede.m',
      phone: '+251911000003',
      status: 'suspended',
      lastLoginAt: '2026-09-30T10:15:00Z',
    },
    {
      id: 'o-004',
      fullName: 'Rahel Assefa',
      username: 'rahel.a',
      phone: '+251911000004',
      status: 'active',
      lastLoginAt: null,
    },
  ],
}

function officersFor(organization: string): Officer[] {
  if (!OFFICERS_BY_ORG[organization]) OFFICERS_BY_ORG[organization] = []
  return OFFICERS_BY_ORG[organization]
}

function findOfficer(organization: string, id: string): Officer {
  const found = officersFor(organization).find((o) => o.id === id)
  if (!found) throw new OfficerError('Officer not found')
  return found
}

// --- Functions the screens call ----------------------------------------
// Later each becomes a real request. The backend must check that the caller
// is an org admin of THIS organization, and record the action in the audit log.

export async function fetchOfficers(organization: string): Promise<Officer[]> {
  await delay()
  return officersFor(organization).map((o) => ({ ...o }))
}

let nextOfficerNumber = 5

export async function addOfficer(
  organization: string,
  input: NewOfficerInput,
): Promise<Officer> {
  await delay()

  if (!/^[a-z0-9._-]{3,30}$/i.test(input.username)) {
    throw new OfficerError(
      'Username must be 3 to 30 characters: letters, numbers, dots, dashes or underscores.',
    )
  }
  if (!isValidPhone(input.phone)) {
    throw new OfficerError(
      'Enter an Ethiopian mobile number, like +251911000001 or 0911000001.',
    )
  }

  const wanted = input.username.toLowerCase()
  const usernameTaken =
    MOCK_ACCOUNTS.some((a) => a.username.toLowerCase() === wanted) ||
    Object.values(OFFICERS_BY_ORG).some((list) =>
      list.some((o) => o.username.toLowerCase() === wanted),
    )
  if (usernameTaken) throw new OfficerError('That username is already taken.')

  const officer: Officer = {
    id: `o-${String(nextOfficerNumber++).padStart(3, '0')}`,
    fullName: input.fullName,
    username: input.username,
    phone: input.phone,
    status: 'active',
    lastLoginAt: null,
  }
  officersFor(organization).push(officer)
  return { ...officer }
}

export async function setOfficerStatus(
  organization: string,
  id: string,
  status: OfficerStatus,
): Promise<void> {
  await delay(250)
  findOfficer(organization, id).status = status
}

// Real version: the backend resets the password and the 2FA enrolment and
// sends one-time instructions to the officer's phone.
export async function resetOfficer(
  organization: string,
  id: string,
): Promise<void> {
  await delay(250)
  findOfficer(organization, id)
}