import { Button } from '@/components/ui/button'

interface SettingsSaveBarProps {
  dirty: boolean
  busy: boolean
  blocked?: string // a reason the draft cannot be saved yet
  error: string
  notice: string
  onSave: () => void
  onDiscard: () => void
}

export default function SettingsSaveBar({
  dirty,
  busy,
  blocked,
  error,
  notice,
  onSave,
  onDiscard,
}: SettingsSaveBarProps) {
  return (
    <div className="space-y-3">
      {notice && (
        <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      )}
      {blocked && dirty && <p className="text-sm text-amber-800">{blocked}</p>}
      <div className="flex gap-3">
        <Button disabled={!dirty || busy || Boolean(blocked)} onClick={onSave}>
          {busy ? 'Saving...' : 'Save changes'}
        </Button>
        <Button variant="ghost" disabled={!dirty || busy} onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  )
}