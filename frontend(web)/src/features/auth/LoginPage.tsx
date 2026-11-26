import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react'

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
import type { User } from '@/types/user'
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

  function completeLogin(user: User) {
    const home = ROLE_HOME_PATH[user.role]
    if (!hasWebAccess(user.role) || !home) {
      setStep('mobile-only')
    } else {
      login(user)
      if (user.mustChangePassword) {
        navigate('/change-password', { replace: true })
      } else {
        navigate(home, { replace: true })
      }
    }
  }

  async function handleCredentials(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const cleanUsername = username.trim()
      const result = await submitCredentials(cleanUsername, password)

      // If OTP is not required (already verified previously / subsequent login):
      if (!result.requiresTwoFactor && result.user) {
        completeLogin(result.user)
        return
      }

      // Check if browser already verified this account
      const otpVerifiedKey = `ethioalert_otp_verified_${cleanUsername}`
      const alreadyVerified = localStorage.getItem(otpVerifiedKey) === 'true'
      if (alreadyVerified && result.challengeId && (result.debugOtp || !liveApi)) {
        const autoCode = result.debugOtp || '123456'
        const authResult = await submitTwoFactor(result.challengeId, autoCode)
        completeLogin(authResult.user)
        return
      }

      setChallengeId(result.challengeId || '')
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
      // Remember that OTP has been verified once for this account
      localStorage.setItem(`ethioalert_otp_verified_${username.trim()}`, 'true')
      completeLogin(result.user)
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
    setEmailWarning('')
    setError('')
  }

  return (
    <div className="login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="login-card relative z-10 grid w-full max-w-[980px] overflow-hidden rounded-[26px] bg-white border border-slate-200/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left panel — White Brand Showcase */}
        <section className="login-brand relative hidden min-h-[580px] overflow-hidden bg-white border-r border-slate-100 px-10 py-12 lg:flex lg:flex-col lg:justify-between">
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Big Brand Logo — seamless on white background */}
            <div className="mb-4 flex w-full max-w-[340px] justify-center">
              <img
                src="/ethioalert-brand.jpg"
                alt="EthioAlert - Stay Informed. Stay Safe."
                className="h-auto w-full object-contain"
              />
            </div>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-[#0d9488]">
              National Emergency Alert System
            </p>
            <p className="mt-3 max-w-[320px] text-[13px] leading-relaxed text-slate-600">
              The national emergency alert and citizen safety console. Ethio Alert and partner
              organizations use it to report incidents, verify threats, and dispatch
              coordinated public warnings across Ethiopia.
            </p>
          </div>

          <div className="relative z-10 border-t border-slate-100 pt-4 text-center text-[11px] font-medium tracking-wide text-slate-400">
            Federal Democratic Republic of Ethiopia · Ethio Alert
          </div>
        </section>

        {/* Right panel — Sign in form */}
        <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-12 sm:py-14">
          <div className="w-full max-w-[340px]">
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <div className="mb-2 w-52 overflow-hidden">
                <img
                  src="/ethioalert-brand.jpg"
                  alt="EthioAlert"
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>

            <h2 className="text-[30px] font-bold leading-none tracking-tight text-slate-900">
              Sign in
            </h2>
            <p className="mt-2.5 text-[13px] leading-5 text-slate-500">
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
                    <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <Input
                      id="username"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      placeholder="User Name"
                      required
                      className="h-[52px] rounded-[10px] border border-slate-200 bg-slate-50/80 pl-12 text-[14px] text-slate-900 placeholder:text-slate-400 shadow-none focus-visible:border-[#0d9488] focus-visible:ring-2 focus-visible:ring-[#0d9488]/20"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="sr-only">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      placeholder="Password"
                      className="h-[52px] rounded-[10px] border border-slate-200 bg-slate-50/80 px-12 text-[14px] text-slate-900 placeholder:text-slate-400 shadow-none focus-visible:border-[#0d9488] focus-visible:ring-2 focus-visible:ring-[#0d9488]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#0d9488] hover:text-[#0b7a74]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[13px]">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0d9488] focus:ring-[#0d9488]"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="font-medium text-[#0d9488] hover:underline"
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
                  className="h-[52px] w-full rounded-[10px] bg-[#0d9488] text-[15px] font-semibold text-white hover:bg-[#0b7a74] shadow-md shadow-teal-900/10"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Sign in'}
                </Button>

                <p className="pt-2 text-center text-[13px] text-slate-500">
                  Don&apos;t have an account?{' '}
                  <span className="font-semibold text-[#0d9488]">
                    Staff access only
                  </span>
                </p>
              </form>
            )}

            {step === 'twofactor' && (
              <form onSubmit={handleTwoFactor} className="mt-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs font-medium text-slate-600">
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
                    className="h-[52px] rounded-[10px] border border-slate-200 bg-slate-50/80 text-center font-mono text-lg tracking-widest text-[#0d9488] shadow-none focus-visible:border-[#0d9488] focus-visible:ring-2 focus-visible:ring-[#0d9488]/20"
                  />
                  <span className="block text-center text-[11px] text-slate-500">
                    {emailHint
                      ? `A verification code was sent to ${emailHint}.`
                      : 'Enter the 6-digit verification code sent to your email or phone.'}
                  </span>
                  {liveApi && emailWarning ? (
                    <span className="block text-center text-[10px] font-medium text-amber-700">
                      {emailWarning}
                    </span>
                  ) : null}
                  {debugOtp ? (
                    <span className="block text-center font-mono text-[11px] font-semibold text-teal-400">
                      On-screen OTP code: {debugOtp}
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
                  className="h-[52px] w-full rounded-[10px] bg-[#0d9488] text-[15px] font-semibold text-white hover:bg-[#0b7a74] shadow-md shadow-teal-900/10"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify and sign in'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-[13px] text-slate-500 hover:text-slate-900"
                  onClick={startOver}
                >
                  Back to sign in
                </Button>
              </form>
            )}

            {step === 'mobile-only' && (
              <div className="mt-8 space-y-4 py-2 text-center">
                <p className="text-sm text-slate-900">Please use the mobile app.</p>
                <p className="text-xs text-slate-500">
                  Citizens receive emergency broadcasts through mobile push notifications and SMS alerts.
                </p>
                <Button
                  className="h-[52px] w-full rounded-[10px] bg-[#0d9488] text-[15px] font-semibold text-white hover:bg-[#0b7a74]"
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
