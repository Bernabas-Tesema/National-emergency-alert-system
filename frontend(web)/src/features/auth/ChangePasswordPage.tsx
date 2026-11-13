import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthError } from '@/api/auth-error'
import { liveApi } from '@/api/config'
import { liveChangePassword } from '@/api/liveAuth'
import { useAuth } from '@/features/auth/useAuth'
import { ROLE_HOME_PATH } from '@/types/role'

export default function ChangePasswordPage() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const usingEmailLink = Boolean(token)
  const requiresCurrent = !usingEmailLink && Boolean(user) && !user?.mustChangePassword

  const title = useMemo(
    () => (user?.mustChangePassword || usingEmailLink ? 'Set a new password' : 'Change password'),
    [user?.mustChangePassword, usingEmailLink],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('Use at least 8 characters for the new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    if (requiresCurrent && !currentPassword) {
      setError('Enter your current temporary password.')
      return
    }

    setBusy(true)
    try {
      if (liveApi) {
        await liveChangePassword({
          newPassword,
          currentPassword: requiresCurrent ? currentPassword : '',
          token: usingEmailLink ? token : '',
        })
      } else if (usingEmailLink || user) {
        // Mock mode: accept any change locally.
      } else {
        throw new AuthError('Sign in first, or open the link from your EthioAlert email.')
      }

      if (user) {
        login({ ...user, mustChangePassword: false })
        const home = ROLE_HOME_PATH[user.role] || '/'
        setDone(true)
        navigate(home, { replace: true })
      } else {
        setDone(true)
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not change password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[24px] bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2563eb]">EthioAlert</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {usingEmailLink
            ? 'You opened the secure link from your EthioAlert credentials email. Choose a new password to finish activating your account.'
            : 'For security, organization and staff accounts must replace the temporary password before using the console.'}
        </p>

        {done && !user ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Password updated. You can now sign in to EthioAlert.
            </p>
            <Link to="/login" className="inline-flex text-sm font-semibold text-[#2563eb] hover:underline">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {requiresCurrent && (
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-11 rounded-xl border-0 bg-[#eef2f7]"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 rounded-xl border-0 bg-[#eef2f7]"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl border-0 bg-[#eef2f7]"
                required
                minLength={8}
              />
            </div>
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-[#1e3a8a] text-white hover:bg-[#1d4ed8]"
            >
              {busy ? 'Saving...' : 'Save new password'}
            </Button>
            {user && (
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-800"
              >
                Sign out
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
