import { MOCK_ACCOUNTS, type MockAccount } from './mockAccounts'
import type { User } from '@/types/user'

const MOCK_2FA_CODE = '123456'

// Pretend the network takes a moment, so loading states can be tested.
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

// Accounts that passed step 1 and are waiting for their 2FA code.
const pendingLogins = new Map<string, MockAccount>()

export class AuthError extends Error {}

function toUser(account: MockAccount): User {
  return {
    id: account.id,
    username: account.username,
    fullName: account.fullName,
    role: account.role,
    organization: account.organization,
  }
}

// Step 1: username + password.
export async function submitCredentials(
  username: string,
  password: string,
): Promise<{ challengeId: string }> {
  await delay()
  const account = MOCK_ACCOUNTS.find(
    (a) => a.username === username && a.password === password,
  )
  if (!account) throw new AuthError('Invalid username or password')

  const challengeId = crypto.randomUUID()
  pendingLogins.set(challengeId, account)
  return { challengeId }
}

// Step 2: the 2FA code.
export async function submitTwoFactor(
  challengeId: string,
  code: string,
): Promise<{ token: string; user: User }> {
  await delay()
  const account = pendingLogins.get(challengeId)
  if (!account) throw new AuthError('Session expired. Please sign in again.')
  if (code !== MOCK_2FA_CODE) throw new AuthError('Incorrect verification code')

  pendingLogins.delete(challengeId)
  return { token: `mock-token-${account.id}`, user: toUser(account) }
}
// Step-up check before a sensitive action. MOCK: only compares the fixed code.
// Real version: the server verifies a fresh 2FA code and ties the approval to
// the specific action, so the browser cannot skip it by editing this function.
export async function verifyStepUp(code: string): Promise<void> {
  await delay(300)
  if (code !== MOCK_2FA_CODE) throw new AuthError('Incorrect verification code')
}