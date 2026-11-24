
import { useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
] as const

interface Options {
  timeoutMs: number
  warningMs: number
  onTimeout: () => void
  enabled: boolean
}

export function useIdleTimeout({
  timeoutMs,
  warningMs,
  onTimeout,
  enabled,
}: Options) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  // Set for real when the timer starts (in the effect below). The clock must
  // not be read while the screen is being drawn.
  const lastActivity = useRef(0)

  const warning = useRef(false)
  const onTimeoutRef = useRef(onTimeout)

  // Always call the newest version of onTimeout.
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  })

  useEffect(() => {
    if (!enabled) return

    lastActivity.current = Date.now()
    warning.current = false

    // Once the warning is showing, only the buttons can keep the user in,
    // so a stray mouse movement does not dismiss it.
    function markActive() {
      if (!warning.current) {
        lastActivity.current = Date.now()
      }
    }

    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, markActive, { passive: true }),
    )

    // Check the clock every second. Real timestamps ensure that a sleeping
    // laptop or background tab still times out when it wakes.
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current

      if (idle >= timeoutMs) {
        window.clearInterval(timer)
        warning.current = false
        setSecondsLeft(null)
        onTimeoutRef.current()
        return
      }

      if (idle >= timeoutMs - warningMs) {
        warning.current = true
        setSecondsLeft(Math.ceil((timeoutMs - idle) / 1000))
      }
    }, 1000)

    return () => {
      window.clearInterval(timer)

      ACTIVITY_EVENTS.forEach((name) =>
        window.removeEventListener(name, markActive),
      )
    }
  }, [enabled, timeoutMs, warningMs])

  function stayActive() {
    lastActivity.current = Date.now()
    warning.current = false
    setSecondsLeft(null)
  }

  return { secondsLeft, stayActive }
}
