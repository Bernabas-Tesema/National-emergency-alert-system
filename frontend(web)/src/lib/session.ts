function secondsFromEnv(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// Defaults: 15 minutes idle, with a 1 minute warning. The two settings below
// let you shorten them for testing (see VITE_IDLE_* in .env.local).
export const IDLE_TIMEOUT_MS =
  secondsFromEnv(import.meta.env.VITE_IDLE_TIMEOUT_SECONDS, 15 * 60) * 1000

export const IDLE_WARNING_MS = Math.min(
  secondsFromEnv(import.meta.env.VITE_IDLE_WARNING_SECONDS, 60) * 1000,
  IDLE_TIMEOUT_MS / 2,
)
// Remembers why the user was signed out, so the login page can explain it.
// This is only a message. It grants nothing, and clearing it breaks nothing.
const REASON_KEY = 'ness-signout-reason'

export function rememberTimeoutSignOut() {
  try {
    sessionStorage.setItem(REASON_KEY, 'timeout')
  } catch {
    // storage unavailable: the message is optional, so ignore
  }
}

export function wasSignedOutByTimeout(): boolean {
  try {
    return sessionStorage.getItem(REASON_KEY) === 'timeout'
  } catch {
    return false
  }
}

export function clearSignOutReason() {
  try {
    sessionStorage.removeItem(REASON_KEY)
  } catch {
    // storage unavailable: nothing to clear
  }
}