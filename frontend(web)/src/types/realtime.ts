import type { CaseStatus } from './case'

// What the server can tell us. Everything else is ignored.
export type RealtimeEvent =
  | { type: 'case_changed'; caseId: string; status: CaseStatus }
  | { type: 'case_message'; caseId: string; authorId: string; authorName: string }

export type ConnectionState = 'connecting' | 'live' | 'reconnecting'