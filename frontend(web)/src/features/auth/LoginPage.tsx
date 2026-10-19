import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ShieldCheck, AlertCircle } from 'lucide-react'

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

  function quickFill(user: string) {
    setUsername(user)
    setPassword('Password123!')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c1417] p-4 font-sans text-slate-100">
      <Card className="w-full max-w-md border border-[#1b2e34] bg-[#111d21] shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-[#1b2e34] bg-[#09181b] p-6 text-center space-y-1.5">
          <div className="mx-auto w-10 h-10 rounded-xl bg-[#133e42] border border-teal-500/30 flex items-center justify-center text-teal-400 mb-2 shadow-[0_0_15px_rgba(45,212,191,0.25)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-white">
            EthioAlert Operations Console
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            {step === 'credentials' && 'National Emergency Alert and Citizen Safety Portal'}
            {step === 'twofactor' && 'Two-Factor Authentication Step-Up Required'}
            {step === 'mobile-only' && 'Web access is restricted to verified staff only'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {step === 'credentials' && timedOut && (
            <p className="mb-4 rounded-lg border border-amber-800 bg-amber-950/60 px-3 py-2 text-xs text-amber-200">
              You were signed out because of inactivity. Please sign in again.
            </p>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-slate-300">
                  Username
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="e.g. sysadmin1 or provider1"
                    required
                    className="bg-[#0c1417] border-[#1b2e34] text-slate-100 placeholder-slate-500 focus:border-teal-400 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  className="bg-[#0c1417] border-[#1b2e34] text-slate-100 placeholder-slate-500 focus:border-teal-400 text-xs"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-950/70 border border-red-800 p-2.5 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2.5 transition-colors shadow-md"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Continue'}
              </Button>

              {/* Demo Quick-Fill Roles */}
              <div className="pt-4 border-t border-[#1b2e34] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400/80 block text-center">
                  Quick Demo Accounts (Password: Password123!)
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => quickFill('sysadmin1')}
                    className="p-1.5 rounded bg-[#162327] border border-[#1b2e34] text-slate-300 hover:text-teal-300 hover:border-teal-500/40 text-left truncate"
                  >
                    sysadmin1 (Super Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('admin1')}
                    className="p-1.5 rounded bg-[#162327] border border-[#1b2e34] text-slate-300 hover:text-teal-300 hover:border-teal-500/40 text-left truncate"
                  >
                    admin1 (Administrator)
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('officer1')}
                    className="p-1.5 rounded bg-[#162327] border border-[#1b2e34] text-slate-300 hover:text-teal-300 hover:border-teal-500/40 text-left truncate"
                  >
                    officer1 (Higher Officer)
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('dispatcher1')}
                    className="p-1.5 rounded bg-[#162327] border border-[#1b2e34] text-slate-300 hover:text-teal-300 hover:border-teal-500/40 text-left truncate"
                  >
                    dispatcher1 (Dispatcher)
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('provider1')}
                    className="p-1.5 rounded bg-[#162327] border border-[#1b2e34] text-slate-300 hover:text-teal-300 hover:border-teal-500/40 text-left truncate"
                  >
                    provider1 (Resource Org)
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('auditor1')}
                    className="p-1.5 rounded bg-[#162327] border border-[#1b2e34] text-slate-300 hover:text-teal-300 hover:border-teal-500/40 text-left truncate"
                  >
                    auditor1 (Auditor)
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'twofactor' && (
            <form onSubmit={handleTwoFactor} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-medium text-slate-300">
                  Verification code
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  required
                  className="bg-[#0c1417] border-[#1b2e34] text-center font-mono text-lg tracking-widest text-teal-300 focus:border-teal-400"
                />
                <span className="text-[10px] text-slate-400 block text-center">
                  Mock 2FA verification code: <strong>123456</strong>
                </span>
              </div>

              {error && (
                <div className="rounded-lg bg-red-950/70 border border-red-800 p-2.5 text-xs text-red-300">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2.5"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify and sign in'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-400 hover:text-white text-xs"
                onClick={startOver}
              >
                Back to sign in
              </Button>
            </form>
          )}

          {step === 'mobile-only' && (
            <div className="space-y-4 text-center py-2">
              <p className="text-sm text-slate-300">
                Please use the mobile app.
              </p>
              <p className="text-xs text-slate-500">
                Citizens receive emergency broadcasts through mobile push notifications and SMS alerts.
              </p>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-500 text-white text-xs"
                onClick={startOver}
              >
                Back to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}