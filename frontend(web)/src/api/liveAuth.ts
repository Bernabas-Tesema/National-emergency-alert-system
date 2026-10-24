import type { User } from '@/types/user'
import type { Role } from '@/types/role'
import { AuthError } from './auth-error'
import { ApiError, apiFetch, setAccessToken } from './client'

const DEV_STEP_UP = '123456'

interface StaffSession {
  token: string
  user: User
}

const pending = new Map<string, StaffSession>()

const ROLE_BY_API: Record<string, Role> = {
  insa_admin: 'ADMINISTRATOR',
  insa_officer: 'HIGHER_OFFICER',
  organization_officer: 'ORG_OFFICER',
  citizen: 'citizen',
}

const NAMES: Record<string, string> = {
  insa_admin: 'INSA Administrator',
  insa_officer: 'INSA Officer',
  org_officer: 'Organization Officer',
}

function readRole(token: string): string {
  try {
    const payload = token.split('.')[1]
    if (!payload) return ''
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as { role?: string }
    return claims.role ?? ''
  } catch {
    return ''
  }
}

function toUser(username: string, token: string): User {
  const apiRole = readRole(token)
  return {
    id: username,
    username,
    fullName: NAMES[username] ?? username,
    role: ROLE_BY_API[apiRole] ?? 'ADMINISTRATOR',
    organization: apiRole === 'organization_officer' ? 'Partner organization' : 'INSA',
  }
}

export async function liveSubmitCredentials(
  username: string,
  password: string,
): Promise<{ challengeId: string }> {
  try {
    const result = await apiFetch<{ access_token: string }>('/api/v1/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    const challengeId = crypto.randomUUID()
    pending.set(challengeId, {
      token: result.access_token,
      user: toUser(username, result.access_token),
    })
    return { challengeId }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new AuthError('Invalid username or password')
    }
    throw new AuthError(err instanceof Error ? err.message : 'Could not reach the API')
  }
}

export async function liveSubmitTwoFactor(
  challengeId: string,
  code: string,
): Promise<{ token: string; user: User }> {
  const session = pending.get(challengeId)
  if (!session) throw new AuthError('Session expired. Please sign in again.')
  if (code !== DEV_STEP_UP) throw new AuthError('Incorrect verification code')
  pending.delete(challengeId)
  setAccessToken(session.token)
  return { token: session.token, user: session.user }
}
