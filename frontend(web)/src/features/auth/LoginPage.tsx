import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { AuthError, submitCredentials, submitTwoFactor } from '@/api/auth'
import { useAuth } from '@/features/auth/useAuth'
import {
  clearSignOutReason,
  wasSignedOutByTimeout,
} from '@/lib/session'
import { ROLE_HOME_PATH, hasWebAccess } from '@/types/role'
import { liveApi } from '@/api/config'

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
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [debugOtp, setDebugOtp] = useState('')
  const [emailWarning, setEmailWarning] = useState('')
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
      setEmailHint(result.emailHint || '')
      setDebugOtp(result.debugOtp || '')
      setEmailWarning(result.emailWarning || '')
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
        if (result.user.mustChangePassword) {
          navigate('/change-password', { replace: true })
        } else {
          navigate(home, { replace: true })
        }
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
    setEmailHint('')
    setDebugOtp('')
    setEmailWarning('')
    setError('')
  }

  function quickFill(user: string, nextPassword = 'Password123!') {
    setUsername(user)
    setPassword(nextPassword)
    setShowDemoAccounts(false)
  }

  const demoAccounts = liveApi
    ? [
        ['sysadmin1', 'Super Admin', 'change-me'],
        ['admin1', 'Administrator', 'change-me'],
        ['officer1', 'Higher Officer', 'change-me'],
        ['dispatcher1', 'Dispatcher', 'change-me'],
        ['auditor1', 'Auditor', 'change-me'],
        ['orgadmin1', 'Org Admin', 'change-me'],
        ['provider1', 'Org Officer', 'change-me'],
        ['insa_admin', 'Legacy Admin', 'change-me'],
        ['org_officer', 'Legacy Org', 'change-me'],
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
    <div className="login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="login-card relative z-10 grid w-full max-w-[980px] overflow-hidden rounded-[26px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] lg:grid-cols-[0.92fr_1.08fr]">
        {/* Left panel — exact mockup composition */}
        <section className="login-brand relative hidden min-h-[580px] overflow-hidden px-11 py-14 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="login-spheres" aria-hidden="true">
            <span className="login-sphere login-sphere-lg" />
            <span className="login-sphere login-sphere-md" />
            <span className="login-sphere login-sphere-sm" />
            <span className="login-sphere login-sphere-xs" />
            <span className="login-sphere login-sphere-tiny" />
          </div>

          <div className="relative z-10 max-w-[300px]">
            <p className="text-[34px] font-extrabold uppercase leading-none tracking-[0.06em] text-white">
              Welcome
            </p>
            <h1 className="mt-5 text-[20px] font-bold uppercase leading-snug tracking-[0.05em] text-white">
              EthioAlert
            </h1>
            <p className="mt-6 text-[12.5px] leading-[1.7] text-[#d7e6ff]">
              The national emergency alert and citizen safety console. INSA and partner
              organizations use it to report incidents, confirm what is real, and send
              a public warning only after two different officers approve it.
            </p>
            <p className="mt-4 text-[12.5px] leading-[1.7] text-[#d7e6ff]">
              INSA and partner organizations use it to report incidents, confirm what is
              real, and send a public warning only after two different officers approve it.
            </p>
          </div>
        </section>

        {/* Right panel — Sign in form */}
        <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-12 sm:py-14">
          <div className="w-full max-w-[340px]">
            <div className="mb-6 lg:hidden">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f6fed]">
                EthioAlert
              </p>
            </div>

            <h2 className="text-[32px] font-bold leading-none tracking-tight text-[#1a1a1a]">
              Sign in
            </h2>
            <p className="mt-3 text-[13px] leading-5 text-[#8b93a7]">
              {step === 'credentials' &&
                'National Emergency Alert and Citizen Safety Portal'}
              {step === 'twofactor' && 'Two-Factor Authentication Step-Up Required'}
              {step === 'mobile-only' && 'Web access is restricted to verified staff only'}
            </p>

            {step === 'credentials' && timedOut && (
              <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                You were signed out because of inactivity. Please sign in again.
              </p>
            )}

            {step === 'credentials' && (
              <form onSubmit={handleCredentials} className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="username" className="sr-only">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aa3b5]" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      placeholder="User Name"
                      required
                      className="h-[52px] rounded-[10px] border-0 bg-[#eceff3] pl-12 text-[14px] text-[#1a1a1a] placeholder:text-[#9aa3b5] shadow-none focus-visible:ring-2 focus-visible:ring-[#2f6fed]/30"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="sr-only">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aa3b5]" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      placeholder="Password"
                      className="h-[52px] rounded-[10px] border-0 bg-[#eceff3] px-12 text-[14px] text-[#1a1a1a] placeholder:text-[#9aa3b5] shadow-none focus-visible:ring-2 focus-visible:ring-[#2f6fed]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#2f6fed]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[13px]">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[#5b6475]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#c5cad3] text-[#2f6fed] focus:ring-[#2f6fed]"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="font-medium text-[#2f6fed] hover:underline"
                    onClick={() =>
                      setError('Password reset is handled by your system administrator.')
                    }
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-[52px] w-full rounded-[10px] bg-[#1e3a8a] text-[15px] font-semibold text-white hover:bg-[#1d4ed8]"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Sign in'}
                </Button>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#e4e7ec]" />
                  </div>
                  <div className="relative flex justify-center text-[13px]">
                    <span className="bg-white px-3 text-[#8b93a7]">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDemoAccounts((v) => !v)}
                  className="flex h-[52px] w-full items-center justify-center rounded-[10px] border border-[#1a1a1a] bg-white text-[15px] font-semibold text-[#1a1a1a] transition hover:bg-[#f8fafc]"
                >
                  Sign in with other
                </button>

                {showDemoAccounts && (
                  <div className="space-y-2 rounded-[12px] border border-[#e4e7ec] bg-[#f8fafc] p-3">
                    <span className="block text-center text-[10px] font-bold uppercase tracking-wider text-[#8b93a7]">
                      {liveApi
                        ? 'API accounts (password: change-me)'
                        : 'Quick Demo Accounts (Password: Password123!)'}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {demoAccounts.map(([user, label, accountPassword]) => (
                        <button
                          key={user}
                          type="button"
                          onClick={() => quickFill(user, accountPassword)}
                          className="truncate rounded-lg border border-[#e4e7ec] bg-white p-2 text-left text-[#5b6475] hover:border-[#2f6fed]/40 hover:text-[#1d4ed8]"
                        >
                          {user} ({label})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="pt-2 text-center text-[13px] text-[#8b93a7]">
                  Don&apos;t have an account?{' '}
                  <span className="font-semibold text-[#2f6fed]">
                    Staff access only
                  </span>
                </p>
              </form>
            )}

            {step === 'twofactor' && (
              <form onSubmit={handleTwoFactor} className="mt-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs font-medium text-[#5b6475]">
                    Verification code
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    autoComplete="one-time-code"
                    required
                    className="h-[52px] rounded-[10px] border-0 bg-[#eceff3] text-center font-mono text-lg tracking-widest text-[#1d4ed8] shadow-none focus-visible:ring-2 focus-visible:ring-[#2f6fed]/30"
                  />
                  <span className="block text-center text-[10px] text-[#8b93a7]">
                    {liveApi
                      ? emailHint
                        ? `A random code was emailed to ${emailHint}.`
                        : 'A random verification code was emailed to your login address.'
                      : 'Mock 2FA verification code: 123456'}
                  </span>
                  {liveApi && emailWarning ? (
                    <span className="block text-center text-[10px] font-medium text-amber-700">
                      {emailWarning}
                    </span>
                  ) : null}
                  {liveApi && debugOtp ? (
                    <span className="block text-center text-[10px] font-medium text-amber-600">
                      Dev mode code: {debugOtp}
                    </span>
                  ) : null}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-[52px] w-full rounded-[10px] bg-[#1e3a8a] text-[15px] font-semibold text-white hover:bg-[#1d4ed8]"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify and sign in'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-[13px] text-[#8b93a7] hover:text-[#1a1a1a]"
                  onClick={startOver}
                >
                  Back to sign in
                </Button>
              </form>
            )}

            {step === 'mobile-only' && (
              <div className="mt-8 space-y-4 py-2 text-center">
                <p className="text-sm text-[#1a1a1a]">Please use the mobile app.</p>
                <p className="text-xs text-[#8b93a7]">
                  Citizens receive emergency broadcasts through mobile push notifications and SMS alerts.
                </p>
                <Button
                  className="h-[52px] w-full rounded-[10px] bg-[#1e3a8a] text-[15px] font-semibold text-white hover:bg-[#1d4ed8]"
                  onClick={startOver}
                >
                  Back to sign in
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
