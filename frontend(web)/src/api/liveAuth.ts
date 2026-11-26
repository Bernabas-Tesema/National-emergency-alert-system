import type { User } from '@/types/user'
import type { Role } from '@/types/role'
import { AuthError } from './auth-error'
import { ApiError, apiFetch, setAccessToken } from './client'

interface PendingChallenge {
  challengeId: string
  emailHint: string
  debugOtp?: string
}

const pending = new Map<string, PendingChallenge>()

const ROLE_BY_API: Record<string, Role> = {
  insa_admin: 'ADMINISTRATOR',
  insa_officer: 'HIGHER_OFFICER',
  organization_officer: 'ORG_OFFICER',
  dispatcher: 'DISPATCHER',
  auditor: 'AUDITOR',
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

interface StaffLoginChallengeResponse {
  challenge_id?: string
  email_hint?: string
  otp_sent?: boolean
  expires_in_minutes?: number
  debug_otp?: string
  email_warning?: string
  requires_otp?: boolean
  access_token?: string
  must_change_password?: boolean
  full_name?: string
  role?: string
  organization?: string
  email?: string
}

interface StaffLoginResponse {
  access_token: string
  must_change_password?: boolean
  full_name?: string
  role?: string
  organization?: string
  email?: string
}

function toUser(username: string, token: string, login: Partial<StaffLoginResponse>): User {
  const apiRole = readRole(token)
  const frontendRole = (login.role as Role | undefined) || ROLE_BY_API[apiRole] || 'ADMINISTRATOR'
  return {
    id: username,
    username,
    fullName: login.full_name || username,
    role: frontendRole,
    organization: login.organization || (apiRole === 'organization_officer' ? 'Partner organization' : 'Ethio Alert'),
    mustChangePassword: Boolean(login.must_change_password),
    email: login.email || '',
  }
}

export async function liveSubmitCredentials(
  username: string,
  password: string,
): Promise<{
  requiresTwoFactor: boolean
  challengeId?: string
  emailHint?: string
  debugOtp?: string
  emailWarning?: string
  token?: string
  user?: User
}> {
  try {
    const result = await apiFetch<StaffLoginChallengeResponse>('/api/v1/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })

    // If backend returned access_token directly (subsequent login / requires_otp === false):
    if (result.access_token && result.requires_otp === false) {
      setAccessToken(result.access_token)
      let subUsername = username
      try {
        const payload = result.access_token.split('.')[1]
        if (payload) {
          const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
            sub?: string
          }
          subUsername = claims.sub || username
        }
      } catch {
        subUsername = username
      }
      const user = toUser(subUsername, result.access_token, result)
      return {
        requiresTwoFactor: false,
        token: result.access_token,
        user,
      }
    }

    const challengeId = result.challenge_id || ''
    pending.set(challengeId, {
      challengeId,
      emailHint: result.email_hint || '',
      debugOtp: result.debug_otp,
    })
    return {
      requiresTwoFactor: true,
      challengeId,
      emailHint: result.email_hint,
      debugOtp: result.debug_otp,
      emailWarning: result.email_warning,
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new AuthError('Invalid username or password')
    }
    if (err instanceof ApiError) throw new AuthError(err.message)
    throw new AuthError(err instanceof Error ? err.message : 'Could not reach the API')
  }
}

export async function liveSubmitTwoFactor(
  challengeId: string,
  code: string,
): Promise<{ token: string; user: User }> {
  const session = pending.get(challengeId)
  if (!session) throw new AuthError('Session expired. Please sign in again.')
  try {
    const result = await apiFetch<StaffLoginResponse>('/api/v1/auth/staff/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code }),
    })
    pending.delete(challengeId)
    setAccessToken(result.access_token)
    // Username is JWT sub; API does not re-send username — recover from token payload if needed
    let username = ''
    try {
      const payload = result.access_token.split('.')[1]
      if (payload) {
        const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
          sub?: string
        }
        username = claims.sub || ''
      }
    } catch {
      username = result.email?.split('@')[0] || 'staff'
    }
    const user = toUser(username, result.access_token, result)
    return { token: result.access_token, user }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new AuthError(err.message || 'Incorrect verification code')
    }
    if (err instanceof ApiError) throw new AuthError(err.message)
    throw new AuthError('Could not verify the code')
  }
}

export async function liveChangePassword(input: {
  newPassword: string
  currentPassword?: string
  token?: string
}): Promise<void> {
  try {
    await apiFetch('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        new_password: input.newPassword,
        current_password: input.currentPassword || '',
        token: input.token || '',
      }),
    })
  } catch (err) {
    if (err instanceof ApiError) throw new AuthError(err.message)
    throw new AuthError('Could not change password')
  }
}
