import { useContext, useEffect, useRef } from 'react'
import { RealtimeContext, type RealtimeHandler } from './realtime-context'

export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime must be used inside RealtimeProvider')
  return ctx
}

// Screens call this to react to events while they are on screen.
export function useRealtimeEvents(handler: RealtimeHandler) {
  const { subscribe } = useRealtime()
  const latest = useRef(handler)

  // Always call the newest version of the handler without resubscribing.
  useEffect(() => {
    latest.current = handler
  })

  useEffect(() => subscribe((event) => latest.current(event)), [subscribe])
}