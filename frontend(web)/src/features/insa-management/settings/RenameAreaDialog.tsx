import { useState, type FormEvent } from 'react'
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
import type { Area } from '@/types/settings'
import { messageFrom } from './helpers'

interface RenameAreaDialogProps {
  area: Area
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

// Mount this only while it is needed, so each use starts with the current name.
export default function RenameAreaDialog({
  area,
  onSubmit,
  onCancel,
}: RenameAreaDialogProps) {
  const [name, setName] = useState(area.name)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onSubmit(name)
      // On success the parent removes this dialog.
    } catch (err) {
      setError(messageFrom(err))
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
            <DialogTitle>Rename {area.name}</DialogTitle>
            <DialogDescription>
              The new name is used everywhere this area is shown.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-area">Name</Label>
            <Input
              id="rename-area"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save name'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}