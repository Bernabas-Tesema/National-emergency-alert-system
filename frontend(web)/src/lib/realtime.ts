import { subscribeMockEvents } from '@/api/mockRealtimeBus'
import { CASE_STATUSES, type CaseStatus } from '@/types/case'
import type { ConnectionState, RealtimeEvent } from '@/types/realtime'

interface ConnectOptions {
  onEvent: (event: RealtimeEvent) => void
  onStateChange: (state: ConnectionState) => void
}

export interface RealtimeConnection {
  close: () => void
}

function isCaseStatus(value: unknown): value is CaseStatus {
  return (
    typeof value === 'string' &&
    (CASE_STATUSES as readonly string[]).includes(value)
  )
}

// Data from the network is never trusted: check its shape before using it.
export function parseRealtimeEvent(data: unknown): RealtimeEvent | null {
  if (typeof data !== 'string') return null
  let raw: unknown
  try {
    raw = JSON.parse(data)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Record<string, unknown>

  if (
    e.type === 'case_changed' &&
    typeof e.caseId === 'string' &&
    isCaseStatus(e.status)
  ) {
    return { type: 'case_changed', caseId: e.caseId, status: e.status }
  }
  if (
    e.type === 'case_message' &&
    typeof e.caseId === 'string' &&
    typeof e.authorId === 'string' &&
    typeof e.authorName === 'string'
  ) {
    return {
      type: 'case_message',
      caseId: e.caseId,
      authorId: e.authorId,
      authorName: e.authorName,
    }
  }
  return null
}

// A real WebSocket that reconnects by itself: it waits 1s, then 2s, 4s...
// up to 30s between attempts, and starts over once it connects.
// TODO(backend): the server must authenticate this connection. Browsers
// cannot send headers on a WebSocket, so agree on a method (for example a
// short-lived ticket in the URL, or a first message after connecting).
function connectWebSocket(
  url: string,
  { onEvent, onStateChange }: ConnectOptions,
): RealtimeConnection {
  let socket: WebSocket | null = null
  let attempts = 0
  let timer: number | undefined
  let closed = false

  function open() {
    onStateChange(attempts === 0 ? 'connecting' : 'reconnecting')
    socket = new WebSocket(url)

    socket.onopen = () => {
      attempts = 0
      onStateChange('live')
    }
    socket.onmessage = (message) => {
      const event = parseRealtimeEvent(message.data)
      if (event) onEvent(event)
    }
    socket.onclose = () => {
      if (closed) return
      onStateChange('reconnecting')
      const wait = Math.min(1000 * 2 ** attempts, 30000)
      attempts += 1
      timer = window.setTimeout(open, wait)
    }
  }

  open()

  return {
    close() {
      closed = true
      window.clearTimeout(timer)
      socket?.close()
    },
  }
}

// The simulator: listens to the fake channel instead of a server.
function connectMock({
  onEvent,
  onStateChange,
}: ConnectOptions): RealtimeConnection {
  onStateChange('connecting')
  const timer = window.setTimeout(() => onStateChange('live'), 500)
  const unsubscribe = subscribeMockEvents(onEvent)
  return {
    close() {
      window.clearTimeout(timer)
      unsubscribe()
    },
  }
}

// With VITE_WS_URL set we use the real server, otherwise the simulator.
export function connectRealtime(options: ConnectOptions): RealtimeConnection {
  const url = import.meta.env.VITE_WS_URL as string | undefined
  return url ? connectWebSocket(url, options) : connectMock(options)
}