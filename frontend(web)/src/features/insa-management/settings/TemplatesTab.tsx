import { useEffect, useState } from 'react'
import {
  createTemplate,
  fetchTemplates,
  setTemplateEnabled,
  updateTemplate,
} from '@/api/mockTemplates'
import { fetchLanguages } from '@/api/mockSettings'
import DataTable, { type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { renderPreview } from '@/lib/templates'
import type {
  AlertTemplate,
  LanguageSetting,
  TemplateInput,
} from '@/types/settings'
import { messageFrom } from './helpers'
import Messages from './Messages'
import OnOffBadge from './OnOffBadge'
import TemplateForm from './TemplateForm'

export default function TemplatesTab() {
  const [templates, setTemplates] = useState<AlertTemplate[] | null>(null)
  const [languages, setLanguages] = useState<LanguageSetting[]>([])
  const [editing, setEditing] = useState<AlertTemplate | 'new' | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchTemplates(), fetchLanguages()]).then(([t, l]) => {
      if (!cancelled) {
        setTemplates(t)
        setLanguages(l)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!templates) return <p className="text-slate-500">Loading...</p>

  async function handleSubmit(input: TemplateInput) {
    // Errors are left to the form, which shows its own message.
    if (editing === null) return
    const list =
      editing === 'new'
        ? await createTemplate(input)
        : await updateTemplate(editing.id, input)
    setTemplates(list)
    setNotice(editing === 'new' ? 'Template created.' : 'Template saved.')
    setError('')
    setEditing(null)
  }

  async function toggle(template: AlertTemplate) {
    setNotice('')
    setError('')
    try {
      setTemplates(await setTemplateEnabled(template.id, !template.enabled))
      setNotice(`${template.name} was turned ${template.enabled ? 'off' : 'on'}.`)
    } catch (err) {
      setError(messageFrom(err))
    }
  }

  const languageName = (code: string) =>
    languages.find((l) => l.code === code)?.name ?? code

  const columns: Column<AlertTemplate>[] = [
    { header: 'Name', cell: (t) => t.name },
    { header: 'Language', cell: (t) => languageName(t.language) },
    {
      header: 'Message',
      cell: (t) => (
        <span lang={t.language} className="block max-w-md truncate text-sm text-slate-700">
          {renderPreview(t.text)}
        </span>
      ),
    },
    { header: 'Status', cell: (t) => <OnOffBadge on={t.enabled} /> },
    {
      header: 'Actions',
      cell: (t) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNotice('')
              setEditing(t)
            }}
          >
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => void toggle(t)}>
            {t.enabled ? 'Turn off' : 'Turn on'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-slate-600">
          Ready-made message text for the alert composer. Use {'{area}'},{' '}
          {'{time}'} and {'{action}'} where the details go. Administrators can
          still edit the text before an alert is sent for approval.
        </p>
        {editing === null && (
          <Button
            onClick={() => {
              setNotice('')
              setEditing('new')
            }}
          >
            New template
          </Button>
        )}
      </div>

      <Messages notice={notice} error={error} />

      {editing !== null && (
        <TemplateForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          languages={languages}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      <DataTable
        columns={columns}
        rows={templates}
        getRowId={(t) => t.id}
        emptyMessage="No templates yet."
      />
    </div>
  )
}