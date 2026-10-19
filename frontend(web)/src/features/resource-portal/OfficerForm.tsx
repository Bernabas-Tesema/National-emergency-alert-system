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
      className="max-w-xl space-y-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm"
    >
      <h3 className="text-base font-bold text-white">Add officer</h3>
      <div className="space-y-2">
        <Label htmlFor="officer-name" className="text-xs text-slate-300">Full name</Label>
        <Input
          id="officer-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="officer-username" className="text-xs text-slate-300">Username</Label>
        <Input
          id="officer-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100 font-mono text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="officer-phone" className="text-xs text-slate-300">Mobile phone</Label>
        <Input
          id="officer-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="+251911000001"
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100 font-mono text-xs"
        />
      </div>
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      <p className="text-xs text-slate-400">
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