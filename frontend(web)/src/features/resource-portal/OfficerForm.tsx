import { useState, type FormEvent } from 'react'
import { OfficerError } from '@/api/mockOfficers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NewOfficerInput } from '@/types/officer'

interface OfficerFormProps {
  onSubmit: (input: NewOfficerInput) => Promise<void>
  onCancel: () => void
}

export default function OfficerForm({ onSubmit, onCancel }: OfficerFormProps) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !username.trim() || !phone.trim()) {
      setError('Fill in all three fields.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        fullName: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
      })
      // On success the parent hides this form, so nothing more to do here.
    } catch (err) {
      setError(
        err instanceof OfficerError
          ? err.message
          : 'Could not add the officer. Please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-xl bg-white p-6 shadow"
    >
      <h3 className="text-base font-semibold text-slate-900">Add officer</h3>
      <div className="space-y-2">
        <Label htmlFor="officer-name">Full name</Label>
        <Input
          id="officer-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="officer-username">Username</Label>
        <Input
          id="officer-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="officer-phone">Mobile phone</Label>
        <Input
          id="officer-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="+251911000001"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">
        The officer receives an invitation by SMS to set their own password.
      </p>
      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Adding...' : 'Add officer'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}