import { isValidPhone } from '@/lib/phone'
import { ASSIGNABLE_ROLES, organizationFitsRole } from '@/lib/roleRules'
import type {
  AccountStatus,
  NewOrganizationInput,
  NewStaffInput,
  Organization,
  StaffAccount,
} from '@/types/admin'
import type { Role } from '@/types/role'
import { MOCK_ACCOUNTS } from './mockAccounts'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

// A message that is safe to show to the user.
export class AdminError extends Error {}

// All names, numbers and dates below are invented.
const ORGANIZATIONS: Organization[] = [
  { id: 'org-insa', name: 'INSA', kind: 'insa', status: 'active', createdAt: '2026-09-21' },
  { id: 'org-fire', name: 'Addis Ababa Fire & Emergency Authority', kind: 'fire', status: 'active', createdAt: '2026-09-22' },
  { id: 'org-police', name: 'Addis Ababa Police Commission', kind: 'police', status: 'active', createdAt: '2026-09-22' },
  { id: 'org-health', name: 'Addis Ababa Health Bureau', kind: 'health', status: 'active', createdAt: '2026-09-23' },
]

const STAFF: StaffAccount[] = [
  { id: 'u-001', fullName: 'Abebe Kebede', username: 'provider1', phone: '+251911000101', role: 'provider', organizationId: 'org-fire', status: 'active', lastLoginAt: '2026-10-16T08:05:00Z' },
  { id: 'u-002', fullName: 'Selam Tesfaye', username: 'orgadmin1', phone: '+251911000102', role: 'org_admin', organizationId: 'org-fire', status: 'active', lastLoginAt: '2026-10-16T07:40:00Z' },
  { id: 'u-003', fullName: 'Dawit Alemu', username: 'dispatcher1', phone: '+251911000103', role: 'dispatcher', organizationId: 'org-insa', status: 'active', lastLoginAt: '2026-10-15T18:20:00Z' },
  { id: 'u-004', fullName: 'Hanna Bekele', username: 'officer1', phone: '+251911000104', role: 'higher_officer', organizationId: 'org-insa', status: 'active', lastLoginAt: '2026-10-15T16:00:00Z' },
  { id: 'u-005', fullName: 'Yonas Girma', username: 'auditor1', phone: '+251911000105', role: 'auditor', organizationId: 'org-insa', status: 'active', lastLoginAt: null },
  { id: 'u-006', fullName: 'Marta Haile', username: 'sysadmin1', phone: '+251911000106', role: 'system_admin', organizationId: 'org-insa', status: 'active', lastLoginAt: '2026-10-16T09:00:00Z' },
]

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/i

function usernameTaken(username: string): boolean {
  const wanted = username.toLowerCase()
  return (
    MOCK_ACCOUNTS.some((a) => a.username.toLowerCase() === wanted) ||
    STAFF.some((s) => s.username.toLowerCase() === wanted)
  )
}

function findStaff(id: string): StaffAccount {
  const found = STAFF.find((s) => s.id === id)
  if (!found) throw new AdminError('Account not found.')
  return found
}

function findOrganization(id: string): Organization | undefined {
  return ORGANIZATIONS.find((o) => o.id === id)
}

// Nobody may change their own account, so an admin can never lock themselves out.
function refuseSelfChange(actorId: string, target: StaffAccount) {
  if (actorId === target.id) {
    throw new AdminError('You cannot change your own account.')
  }
}

// The last active system administrator must stay active and keep the role.
function isLastActiveAdmin(target: StaffAccount): boolean {
  const activeAdmins = STAFF.filter(
    (s) => s.role === 'system_admin' && s.status === 'active',
  )
  return (
    target.role === 'system_admin' &&
    target.status === 'active' &&
    activeAdmins.length <= 1
  )
}

// --- Functions the screens call ----------------------------------------
// Later each becomes a real request. The backend must repeat every check here,
// confirm the caller is a system admin, and write each action to the audit log.

export async function fetchOrganizations(): Promise<Organization[]> {
  await delay()
  return ORGANIZATIONS.map((o) => ({ ...o }))
}

let nextOrgNumber = 5

export async function createOrganization(
  input: NewOrganizationInput,
): Promise<Organization> {
  await delay()
  const name = input.name.trim()
  if (name.length < 3 || name.length > 80) {
    throw new AdminError('The name must be 3 to 80 characters.')
  }
  if ((input.kind as string) === 'insa') {
    throw new AdminError('INSA is built in and cannot be registered again.')
  }
  if (ORGANIZATIONS.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
    throw new AdminError('An organization with that name already exists.')
  }
  const organization: Organization = {
    id: `org-${String(nextOrgNumber++).padStart(3, '0')}`,
    name,
    kind: input.kind,
    status: 'active',
    createdAt: new Date().toISOString().slice(0, 10),
  }
  ORGANIZATIONS.push(organization)
  return { ...organization }
}

export async function setOrganizationStatus(
  id: string,
  status: AccountStatus,
): Promise<void> {
  await delay(250)
  const found = findOrganization(id)
  if (!found) throw new AdminError('Organization not found.')
  if (found.kind === 'insa' && status === 'suspended') {
    throw new AdminError('INSA cannot be suspended.')
  }
  found.status = status
  // Real backend: suspending an organization must also block its staff.
}

export async function fetchStaff(): Promise<StaffAccount[]> {
  await delay()
  return STAFF.map((s) => ({ ...s }))
}

let nextStaffNumber = 100

export async function createStaff(input: NewStaffInput): Promise<StaffAccount> {
  await delay()
  if (!input.fullName.trim()) throw new AdminError('Enter the full name.')
  if (!USERNAME_PATTERN.test(input.username)) {
    throw new AdminError(
      'Username must be 3 to 30 characters: letters, numbers, dots, dashes or underscores.',
    )
  }
  if (!isValidPhone(input.phone)) {
    throw new AdminError(
      'Enter an Ethiopian mobile number, like +251911000001 or 0911000001.',
    )
  }
  if (!ASSIGNABLE_ROLES.includes(input.role)) {
    throw new AdminError('That role cannot be assigned on the web.')
  }
  const organization = findOrganization(input.organizationId)
  if (!organization) throw new AdminError('Choose an organization.')
  if (organization.status !== 'active') {
    throw new AdminError('That organization is suspended.')
  }
  if (!organizationFitsRole(organization.kind, input.role)) {
    throw new AdminError('That role cannot be used in this organization.')
  }
  if (usernameTaken(input.username)) {
    throw new AdminError('That username is already taken.')
  }

  const account: StaffAccount = {
    id: `u-${String(nextStaffNumber++).padStart(3, '0')}`,
    fullName: input.fullName.trim(),
    username: input.username,
    phone: input.phone,
    role: input.role,
    organizationId: input.organizationId,
    status: 'active',
    lastLoginAt: null,
  }
  STAFF.push(account)
  return { ...account }
}

export async function setStaffStatus(
  actorId: string,
  id: string,
  status: AccountStatus,
): Promise<void> {
  await delay(250)
  const target = findStaff(id)
  refuseSelfChange(actorId, target)
  if (status === 'suspended' && isLastActiveAdmin(target)) {
    throw new AdminError('At least one active system administrator must remain.')
  }
  target.status = status
}

export async function changeStaffRole(
  actorId: string,
  id: string,
  role: Role,
): Promise<void> {
  await delay(250)
  const target = findStaff(id)
  refuseSelfChange(actorId, target)
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new AdminError('That role cannot be assigned on the web.')
  }
  const organization = findOrganization(target.organizationId)
  if (!organization || !organizationFitsRole(organization.kind, role)) {
    throw new AdminError('That role cannot be used in this organization.')
  }
  if (role !== 'system_admin' && isLastActiveAdmin(target)) {
    throw new AdminError('At least one active system administrator must remain.')
  }
  target.role = role
}

// Real version: the backend resets the password and the 2FA enrolment and
// sends one-time instructions to the person's phone.
export async function resetStaff(actorId: string, id: string): Promise<void> {
  await delay(250)
  refuseSelfChange(actorId, findStaff(id))
}