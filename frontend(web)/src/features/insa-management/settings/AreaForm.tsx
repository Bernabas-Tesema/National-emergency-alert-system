import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AREA_KIND_LABELS,
  type Area,
  type AreaKind,
  type NewAreaInput,
} from '@/types/settings'
import { messageFrom } from './helpers'

const KINDS: AreaKind[] = ['region', 'zone', 'subcity']
const selectClass =
  'h-9 w-full rounded-md border border-[#1b2e34] bg-[#0c1417] px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500'

interface AreaFormProps {
  regions: Area[] // only turned-on regions are offered as parents
  onSubmit: (input: NewAreaInput) => Promise<void>
  onCancel: () => void
}

export default function AreaForm({ regions, onSubmit, onCancel }: AreaFormProps) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AreaKind>('subcity')
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const parents = regions.filter((r) => r.kind === 'region' && r.enabled)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Enter a name.')
      return
    }
    if (kind !== 'region' && !parentId) {
      setError('Choose the region it belongs to.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        name: name.trim(),
        kind,
        parentId: kind === 'region' ? null : parentId,
      })
      // On success the parent hides this form.
    } catch (err) {
      setError(messageFrom(err))
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm"
    >
      <h3 className="text-base font-bold text-white">Add area</h3>
      <div className="space-y-2">
        <Label htmlFor="area-name" className="text-xs text-slate-300">Name</Label>
        <Input
          id="area-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="area-kind">Type</Label>
        <select
          id="area-kind"
          className={selectClass}
          value={kind}
          onChange={(e) => setKind(e.target.value as AreaKind)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {AREA_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      {kind !== 'region' && (
        <div className="space-y-2">
          <Label htmlFor="area-parent">Region</Label>
          <select
            id="area-parent"
            className={selectClass}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Select a region</option>
            {parents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Adding...' : 'Add area'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}