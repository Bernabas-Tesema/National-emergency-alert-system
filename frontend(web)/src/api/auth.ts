import { MOCK_ACCOUNTS, type MockAccount } from './mockAccounts'
import type { User } from '@/types/user'
import { liveApi } from './config'
import { AuthError } from './auth-error'
import { liveSubmitCredentials, liveSubmitTwoFactor } from './liveAuth'

export { AuthError }

const MOCK_2FA_CODE = '123456'
const OTP_VERIFIED_KEY = 'ethioalert_otp_verified_accounts'

// Pretend the network takes a moment, so loading states can be tested.
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

// Accounts that passed step 1 and are waiting for their 2FA code.
const pendingLogins = new Map<string, MockAccount>()

export interface CredentialsResult {
  requiresTwoFactor: boolean
  challengeId?: string
  emailHint?: string
  debugOtp?: string
  emailWarning?: string
  token?: string
  user?: User
}

export function getVerifiedAccounts(): Set<string> {
  try {
    const raw = localStorage.getItem(OTP_VERIFIED_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) return new Set(list)
    }
  } catch {
    // fallback
  }
  return new Set()
}

export function markAccountOtpVerified(username: string): void {
  try {
    const set = getVerifiedAccounts()
    set.add(username)
    localStorage.setItem(OTP_VERIFIED_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // fallback
  }
}

export function clearAccountOtpVerified(username?: string): void {
  try {
    if (username) {
      const set = getVerifiedAccounts()
      set.delete(username)
      localStorage.setItem(OTP_VERIFIED_KEY, JSON.stringify(Array.from(set)))
    } else {
      localStorage.removeItem(OTP_VERIFIED_KEY)
    }
  } catch {
    // fallback
  }
}

function toUser(account: MockAccount): User {
  return {
    id: account.id,
    username: account.username,
    fullName: account.fullName,
    role: account.role,
    organization: account.organization,
    mustChangePassword: account.mustChangePassword,
  }
}

// Step 1: username + password.
export async function submitCredentials(
  username: string,
  password: string,
): Promise<CredentialsResult> {
  if (liveApi) return liveSubmitCredentials(username, password)
  await delay()
  const account = MOCK_ACCOUNTS.find(
    (a) => a.username === username && a.password === password,
  )
  if (!account) throw new AuthError('Invalid username or password')

  const verifiedAccounts = getVerifiedAccounts()
  const isFirstLogin = !verifiedAccounts.has(account.username)

  if (isFirstLogin) {
    const challengeId = crypto.randomUUID()
    pendingLogins.set(challengeId, account)
    return {
      requiresTwoFactor: true,
      challengeId,
      emailHint: 'demo@****.local',
    }
  }

  // Subsequent login: OTP not required!
  return {
    requiresTwoFactor: false,
    token: `mock-token-${account.id}`,
    user: toUser(account),
  }
}

// Step 2: the 2FA code.
export async function submitTwoFactor(
  challengeId: string,
  code: string,
): Promise<{ token: string; user: User }> {
  if (liveApi) return liveSubmitTwoFactor(challengeId, code)
  await delay()
  const account = pendingLogins.get(challengeId)
  if (!account) throw new AuthError('Session expired. Please sign in again.')
  if (code !== MOCK_2FA_CODE) throw new AuthError('Incorrect verification code')

  pendingLogins.delete(challengeId)
  markAccountOtpVerified(account.username)
  return { token: `mock-token-${account.id}`, user: toUser(account) }
}
// Step-up check before a sensitive action. MOCK: only compares the fixed code.
// Real version: the server verifies a fresh 2FA code and ties the approval to
// the specific action, so the browser cannot skip it by editing this function.
export async function verifyStepUp(code: string): Promise<void> {
  await delay(300)
  if (code !== MOCK_2FA_CODE) throw new AuthError('Incorrect verification code')
}