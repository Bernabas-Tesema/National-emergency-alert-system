import type { Role } from './role'

export interface User {
  id: string
  username: string
  fullName: string
  role: Role
  organization: string
}