import { useState, type FormEvent } from 'react'
import { AdminError } from '@/api/mockAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ORGANIZATION_KINDS,
  ORGANIZATION_KIND_LABELS,
  type ExternalKind,
  type NewOrganizationInput,
} from '@/types/admin'

const KINDS = ORGANIZATION_KINDS.filter((k): k is ExternalKind => k !== 'insa')

interface OrganizationFormProps {
  onSubmit: (input: NewOrganizationInput) => Promise<void>
  onCancel: () => void
}

export default function OrganizationForm({
  onSubmit,
  onCancel,
}: OrganizationFormProps) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ExternalKind | ''>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !kind) {
      setError('Enter a name and choose a type.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSubmit({ name: name.trim(), kind })
      // On success the parent hides this form.
    } catch (err) {
      setError(
        err instanceof AdminError
          ? err.message
          : 'Could not register the organization. Please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-xl bg-white p-6 shadow"
    >
      <h3 className="text-base font-semibold text-slate-900">
        Register organization
      </h3>
      <div className="space-y-2">
        <Label htmlFor="org-name">Name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-kind">Type</Label>
        <select
          id="org-kind"
          className="h-9 w-full rounded-md border bg-white px-3 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as ExternalKind | '')}
        >
          <option value="">Select a type</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {ORGANIZATION_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Registering...' : 'Register'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}