import type { RealtimeEvent } from '@/types/realtime'

type Handler = (event: RealtimeEvent) => void

// SIMULATION ONLY: stands in for the server pushing events.
// Remove together with the simulator when the real backend exists.
const handlers = new Set<Handler>()

export function emitMockEvent(event: RealtimeEvent) {
  handlers.forEach((handler) => handler(event))
}

export function subscribeMockEvents(handler: Handler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}