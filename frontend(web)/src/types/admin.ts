import type { Role } from './role'

export const ORGANIZATION_KINDS = [
  'insa',
  'police',
  'fire',
  'health',
  'other',
] as const

export type OrganizationKind = (typeof ORGANIZATION_KINDS)[number]

// Every kind except INSA, which is built in and cannot be registered.
export type ExternalKind = Exclude<OrganizationKind, 'insa'>

export const ORGANIZATION_KIND_LABELS: Record<OrganizationKind, string> = {
  insa: 'INSA',
  police: 'Police',
  fire: 'Fire and emergency',
  health: 'Health',
  other: 'Other agency',
}

export type AccountStatus = 'active' | 'suspended'

export interface Organization {
  id: string
  name: string
  kind: OrganizationKind
  status: AccountStatus
  createdAt: string // YYYY-MM-DD
}

export interface StaffAccount {
  id: string
  fullName: string
  username: string
  phone: string
  role: Role
  organizationId: string
  status: AccountStatus
  lastLoginAt: string | null
}

export interface NewOrganizationInput {
  name: string
  kind: ExternalKind
}

export interface NewStaffInput {
  fullName: string
  username: string
  phone: string
  role: Role
  organizationId: string
}