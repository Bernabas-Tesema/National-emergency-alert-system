import { createContext } from 'react'
import type { ConnectionState, RealtimeEvent } from '@/types/realtime'

export type RealtimeHandler = (event: RealtimeEvent) => void

export interface RealtimeContextValue {
  state: ConnectionState
  subscribe: (handler: RealtimeHandler) => () => void
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null)