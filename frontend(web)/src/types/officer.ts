export type OfficerStatus = 'active' | 'suspended'

export interface Officer {
  id: string
  fullName: string
  username: string
  phone: string
  status: OfficerStatus
  lastLoginAt: string | null // ISO date string, null = never signed in
}

// What the "Add officer" form collects.
export interface NewOfficerInput {
  fullName: string
  username: string
  phone: string
}