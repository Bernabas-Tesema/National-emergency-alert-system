import { useEffect, useRef } from 'react'
import { wsClient } from './WebSocketClient'

/**
 * Subscribes to a typed WebSocket event channel.
 * Automatically unsubscribes on unmount.
 *
 * Example:
 * useChannel<{ alertId: string; progress: number }>('alerts.progress', (data) => {
 *   console.log('Broadcast update:', data)
 * })
 */
export function useChannel<T = unknown>(channel: string, onMessage: (data: T) => void) {
  const handlerRef = useRef(onMessage)

  useEffect(() => {
    handlerRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    const unsubscribe = wsClient.subscribe<T>(channel, (payload) => {
      handlerRef.current(payload)
    })

    return () => {
      unsubscribe()
    }
  }, [channel])
}
