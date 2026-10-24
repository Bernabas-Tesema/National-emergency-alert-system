import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ShieldCheck, AlertCircle, Radio, Siren, Users } from 'lucide-react'

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
import { liveApi } from '@/api/config'
import ThemeToggle from '@/features/theme/ThemeToggle'

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

  function quickFill(user: string, password = 'Password123!') {
    setUsername(user)
    setPassword(password)
  }

  const demoAccounts = liveApi
    ? [
        ['insa_admin', 'INSA Administrator', 'change-me'],
        ['insa_officer', 'INSA Officer', 'change-me'],
        ['org_officer', 'Organization Officer', 'change-me'],
      ]
    : [
        ['sysadmin1', 'Super Admin', 'Password123!'],
        ['admin1', 'Administrator', 'Password123!'],
        ['officer1', 'Higher Officer', 'Password123!'],
        ['dispatcher1', 'Dispatcher', 'Password123!'],
        ['provider1', 'Resource Org', 'Password123!'],
        ['auditor1', 'Auditor', 'Password123!'],
      ]

  return (
    <div className="relative min-h-screen font-sans text-slate-100 lg:grid lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <section className="platform-panel flex flex-col justify-center px-8 py-16 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-400/30 bg-teal-400/10 text-teal-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">
            Information Network Security Administration
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
            EthioAlert
          </h1>
          <p className="platform-muted mt-4 text-base leading-relaxed">
            The national emergency alert and citizen safety console. INSA and partner
            organizations use it to report incidents, confirm what is real, and send
            a public warning only after two different officers approve it.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex gap-3">
              <Siren className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
              <span className="platform-muted">
                Partner officers submit fires, floods, health events, and other incidents.
              </span>
            </li>
            <li className="flex gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
              <span className="platform-muted">
                INSA reviews each case, asks for clarification, or rejects it with a written reason.
              </span>
            </li>
            <li className="flex gap-3">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
              <span className="platform-muted">
                Approved alerts go out by push notification, SMS, and voice call to the affected area.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="login-stage flex items-center justify-center bg-[#0c1417] px-4 py-16">
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
                  {liveApi
                    ? 'API accounts (password: change-me)'
                    : 'Quick Demo Accounts (Password: Password123!)'}
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {demoAccounts.map(([user, label, password]) => (
                    <button
                      key={user}
                      type="button"
                      onClick={() => quickFill(user, password)}
                      className="p-1.5 rounded bg-[#162327] border border-[#1b2e34] text-slate-300 hover:text-teal-300 hover:border-teal-500/40 text-left truncate"
                    >
                      {user} ({label})
                    </button>
                  ))}
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
                  {liveApi
                    ? 'Local API sign-in still asks for verification code 123456.'
                    : 'Mock 2FA verification code: 123456'}
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
      </section>
    </div>
  )
}