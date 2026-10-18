import { useState, type FormEvent } from 'react'
import { AuthError, verifyStepUp } from '@/api/auth'
import { SettingsError } from '@/api/mockSettings'
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

interface ReplaceKeyDialogProps {
  gatewayName: string
  onSubmit: (credential: string) => Promise<void>
  onCancel: () => void
}

// Asks for the new key AND a fresh 2FA code. The key is only ever sent to
// the server: it is never shown again, never stored in the browser, and the
// box is emptied when this dialog closes.
export default function ReplaceKeyDialog({
  gatewayName,
  onSubmit,
  onCancel,
}: ReplaceKeyDialogProps) {
  const [credential, setCredential] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!credential.trim()) {
      setError('Enter the new key.')
      return
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit verification code.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await verifyStepUp(code.trim())
      await onSubmit(credential.trim())
      // On success the parent removes this dialog.
    } catch (err) {
      setError(
        err instanceof AuthError || err instanceof SettingsError
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
            <DialogTitle>Replace key for {gatewayName}</DialogTitle>
            <DialogDescription>
              The current key cannot be shown. Enter the new key and your
              verification code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="gw-key">New key</Label>
            <Input
              id="gw-key"
              type="password"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gw-code">Verification code</Label>
            <Input
              id="gw-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Checking...' : 'Replace key'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}