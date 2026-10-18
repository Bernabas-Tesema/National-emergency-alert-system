import React, { useState, useEffect } from 'react'
import { ShieldCheck, X, AlertCircle, KeyRound, Loader2 } from 'lucide-react'

export interface TwoFactorPromptProps {
  isOpen: boolean
  title?: string
  description?: string
  onVerify: (code: string) => Promise<boolean> | boolean
  onCancel: () => void
}

/**
 * Reusable modal for re-prompting 2FA verification before sensitive actions.
 * Returns success or error. Default mock code is 123456.
 */
export function TwoFactorPrompt({
  isOpen,
  title = 'Security Verification Required',
  description = 'Please enter your 6-digit verification code to confirm this sensitive operational action.',
  onVerify,
  onCancel,
}: TwoFactorPromptProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (!isOpen) {
      setCode('')
      setError('')
      setVerifying(false)
      setCountdown(60)
      return
    }

    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      setError('Please enter a full 6-digit code.')
      return
    }

    setError('')
    setVerifying(true)

    try {
      const success = await onVerify(code)
      if (!success) {
        setError('Incorrect verification code. (Hint: Demo code is 123456)')
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-md rounded-xl border border-[#1b2e34] bg-[#0c1417] p-4 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#133e42] p-2.5 text-teal-400 border border-teal-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              6-Digit Authenticator Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  setCode(val)
                  if (error) setError('')
                }}
                autoFocus
                placeholder="123456"
                className="w-full tracking-widest text-center text-lg font-mono rounded-lg bg-[#111d21] border border-[#1b2e34] px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-400 transition-colors"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
              <span>Code expires in: {countdown}s</span>
              <button
                type="button"
                onClick={() => setCountdown(60)}
                className="text-teal-400 hover:underline"
              >
                Resend code
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-950/60 border border-red-800/80 p-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={verifying}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#162327] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={code.length !== 6 || verifying}
              className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-medium text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
            >
              {verifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Verify and Proceed</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TwoFactorPrompt
