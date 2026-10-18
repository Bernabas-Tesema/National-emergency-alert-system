import type { Role } from './role'

export interface Message {
  id: string
  authorId: string
  authorName: string
  authorRole: Role
  text: string
  sentAt: string // ISO date string, e.g. "2026-10-16T09:30:00Z"
}