import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { AuthError, submitCredentials, submitTwoFactor } from '@/api/auth'
import { useAuth } from '@/features/auth/useAuth'
import {
  clearSignOutReason,
  wasSignedOutByTimeout,
} from '@/lib/session'
import { ROLE_HOME_PATH, hasWebAccess } from '@/types/role'

type Step = 'credentials' | 'twofactor' | 'mobile-only'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [timedOut] = useState(wasSignedOutByTimeout)

  useEffect(() => {
    clearSignOutReason()
  }, [])

  const [step, setStep] = useState<Step>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function messageFrom(err: unknown) {
    return err instanceof AuthError
      ? err.message
      : 'Something went wrong. Please try again.'
  }

  async function handleCredentials(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await submitCredentials(username.trim(), password)
      setChallengeId(result.challengeId)
      setStep('twofactor')
    } catch (err) {
      setError(messageFrom(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleTwoFactor(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await submitTwoFactor(challengeId, code.trim())
      const home = ROLE_HOME_PATH[result.user.role]

      if (!hasWebAccess(result.user.role) || !home) {
        setStep('mobile-only')
      } else {
        login(result.user)
        navigate(home, { replace: true })
      }
    } catch (err) {
      setError(messageFrom(err))
    } finally {
      setLoading(false)
    }
  }

  function startOver() {
    setStep('credentials')
    setPassword('')
    setCode('')
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>National Emergency Alert System</CardTitle>
          <CardDescription>
            {step === 'credentials' && 'Sign in with your staff account'}
            {step === 'twofactor' && 'Enter your 6-digit verification code'}
            {step === 'mobile-only' && 'Web access is for staff only'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'credentials' && timedOut && (
            <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You were signed out because of inactivity. Please sign in again.
            </p>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Checking...' : 'Continue'}
              </Button>
            </form>
          )}

          {step === 'twofactor' && (
            <form onSubmit={handleTwoFactor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify and sign in'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={startOver}
              >
                Back to sign in
              </Button>
            </form>
          )}

          {step === 'mobile-only' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                Please use the mobile app.
              </p>

              <Button className="w-full" onClick={startOver}>
                Back to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}