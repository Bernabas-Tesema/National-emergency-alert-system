import { useState, type FormEvent } from 'react'
import { AuthError, verifyStepUp } from '@/api/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StepUpDialogProps {
  title: string
  description: string
  confirmLabel?: string
  // Runs after the code is accepted. The parent should then remove this dialog.
  onVerified: () => void | Promise<void>
  onCancel: () => void
}

// Mount this only while it is needed, so every use starts with an empty box.
export default function StepUpDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  onVerified,
  onCancel,
}: StepUpDialogProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await verifyStepUp(code.trim())
      await onVerified()
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Something went wrong. Please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel()
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="stepup-code" className="text-xs text-slate-300">Verification code</Label>
            <Input
              id="stepup-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              className="border-[#1b2e34] bg-[#0c1417] text-white font-mono tracking-widest text-center text-lg"
            />
            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onCancel}
              className="border-[#1b2e34] text-slate-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-500 text-white">
              {busy ? 'Checking...' : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}