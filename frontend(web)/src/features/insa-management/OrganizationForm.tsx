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
      className="max-w-xl space-y-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm"
    >
      <h3 className="text-base font-bold text-white">
        Register organization
      </h3>
      <div className="space-y-2">
        <Label htmlFor="org-name" className="text-xs text-slate-300">Name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-kind" className="text-xs text-slate-300">Type</Label>
        <select
          id="org-kind"
          className="h-9 w-full rounded-md border border-[#1b2e34] bg-[#0c1417] px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
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
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-500 text-white text-xs">
          {busy ? 'Registering...' : 'Register'}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="text-xs border-[#1b2e34] text-slate-300 hover:text-white">
          Cancel
        </Button>
      </div>
    </form>
  )
}