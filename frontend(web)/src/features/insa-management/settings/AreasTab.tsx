import { useEffect, useState } from 'react'
import {
  createArea,
  fetchAreas,
  renameArea,
  setAreaEnabled,
} from '@/api/mockAreas'
import DataTable, { type Column } from '@/components/DataTable'
import StepUpDialog from '@/components/StepUpDialog'
import { Button } from '@/components/ui/button'
import {
  AREA_KIND_LABELS,
  type Area,
  type NewAreaInput,
} from '@/types/settings'
import AreaForm from './AreaForm'
import { messageFrom, type PendingStep } from './helpers'
import Messages from './Messages'
import OnOffBadge from './OnOffBadge'
import RenameAreaDialog from './RenameAreaDialog'

export default function AreasTab() {
  const [areas, setAreas] = useState<Area[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [renaming, setRenaming] = useState<Area | null>(null)
  const [pending, setPending] = useState<PendingStep | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchAreas().then((list) => {
      if (!cancelled) setAreas(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!areas) return <p className="text-slate-500">Loading...</p>

  const byId = new Map(areas.map((a) => [a.id, a]))

  async function handleCreate(input: NewAreaInput) {
    // Errors are left to the form, which shows its own message.
    setAreas(await createArea(input))
    setShowForm(false)
    setError('')
    setNotice(`${input.name.trim()} was added.`)
  }

  async function handleRename(name: string) {
    // Errors are left to the dialog, which shows its own message.
    if (!renaming) return
    setAreas(await renameArea(renaming.id, name))
    setNotice(`Renamed to ${name.trim()}.`)
    setError('')
    setRenaming(null)
  }

  function requestToggle(area: Area) {
    const next = !area.enabled
    setNotice('')
    setError('')
    setPending({
      title: `${next ? 'Turn on' : 'Turn off'} ${area.name}`,
      description: next
        ? 'It can be chosen again when targeting alerts. Enter your verification code to confirm.'
        : area.kind === 'region'
          ? 'It and everything inside it can no longer be chosen for alerts. Enter your verification code to confirm.'
          : 'It can no longer be chosen for alerts. Enter your verification code to confirm.',
      confirmLabel: next ? 'Turn on' : 'Turn off',
      run: async () => {
        try {
          setAreas(await setAreaEnabled(area.id, next))
          setNotice(`${area.name} was turned ${next ? 'on' : 'off'}.`)
        } catch (err) {
          setError(messageFrom(err))
        }
      },
    })
  }

  const columns: Column<Area>[] = [
    {
      header: 'Name',
      cell: (a) => (
        <span className={a.kind === 'region' ? 'font-medium' : 'pl-6'}>
          {a.name}
        </span>
      ),
    },
    { header: 'Type', cell: (a) => AREA_KIND_LABELS[a.kind] },
    { header: 'Status', cell: (a) => <OnOffBadge on={a.enabled} /> },
    {
      header: 'Actions',
      cell: (a) => {
        const parent = a.parentId ? byId.get(a.parentId) : undefined
        const blockedByParent = !a.enabled && parent !== undefined && !parent.enabled
        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRenaming(a)}>
              Rename
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={blockedByParent}
              title={blockedByParent ? `Turn on ${parent?.name} first` : undefined}
              onClick={() => requestToggle(a)}
            >
              {a.enabled ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-slate-600">
          The areas alerts can be sent to. Turning a region off also turns off
          everything inside it. These names are placeholder data.
        </p>
        {!showForm && (
          <Button
            onClick={() => {
              setNotice('')
              setShowForm(true)
            }}
          >
            Add area
          </Button>
        )}
      </div>

      <Messages notice={notice} error={error} />

      {showForm && (
        <AreaForm
          regions={areas}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      <DataTable columns={columns} rows={areas} getRowId={(a) => a.id} />

      {renaming && (
        <RenameAreaDialog
          area={renaming}
          onSubmit={handleRename}
          onCancel={() => setRenaming(null)}
        />
      )}

      {pending && (
        <StepUpDialog
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          onCancel={() => setPending(null)}
          onVerified={async () => {
            const step = pending
            setPending(null)
            await step.run()
          }}
        />
      )}
    </div>
  )
}