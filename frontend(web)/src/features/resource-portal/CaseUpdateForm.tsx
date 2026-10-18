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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="update-kind" className="text-xs text-slate-300">Request type</Label>
        <select
          id="update-kind"
          className="h-9 w-full rounded-md border border-[#1b2e34] bg-[#0c1417] px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 sm:w-60"
          value={kind}
          onChange={(e) => setKind(e.target.value as CaseUpdateKind)}
        >
          <option value="update">{UPDATE_KIND_LABELS.update}</option>
          <option value="all_clear">{UPDATE_KIND_LABELS.all_clear}</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="update-text" className="text-xs text-slate-300">Message for the public</Label>
        <Textarea
          id="update-text"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
        />
      </div>
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      <Button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-500 text-white text-xs">
        {busy ? 'Sending...' : 'Send to INSA'}
      </Button>
    </form>
  )
}