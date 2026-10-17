import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UPDATE_KIND_LABELS, type CaseUpdateKind } from '@/types/case'

interface CaseUpdateFormProps {
  onSubmit: (kind: CaseUpdateKind, text: string) => Promise<void>
}

export default function CaseUpdateForm({ onSubmit }: CaseUpdateFormProps) {
  const [kind, setKind] = useState<CaseUpdateKind>('update')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) {
      setError('Write what INSA should publish.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSubmit(kind, trimmed)
      setText('')
    } catch {
      setError('Could not send the request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white p-6 shadow">
      <div className="space-y-2">
        <Label htmlFor="update-kind">Request type</Label>
        <select
          id="update-kind"
          className="h-9 w-full rounded-md border bg-white px-3 text-sm sm:w-60"
          value={kind}
          onChange={(e) => setKind(e.target.value as CaseUpdateKind)}
        >
          <option value="update">{UPDATE_KIND_LABELS.update}</option>
          <option value="all_clear">{UPDATE_KIND_LABELS.all_clear}</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="update-text">Message for the public</Label>
        <Textarea
          id="update-text"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? 'Sending...' : 'Send to INSA'}
      </Button>
    </form>
  )
}