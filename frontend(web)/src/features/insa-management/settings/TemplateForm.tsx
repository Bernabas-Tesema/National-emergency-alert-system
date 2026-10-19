import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  PLACEHOLDERS,
  PLACEHOLDER_HELP,
  estimateSms,
  findTemplateProblems,
  renderPreview,
} from '@/lib/templates'
import type {
  AlertTemplate,
  LanguageCode,
  LanguageSetting,
  TemplateInput,
} from '@/types/settings'
import { messageFrom } from './helpers'

interface TemplateFormProps {
  initial?: AlertTemplate // present when editing
  languages: LanguageSetting[]
  onSubmit: (input: TemplateInput) => Promise<void>
  onCancel: () => void
}

export default function TemplateForm({
  initial,
  languages,
  onSubmit,
  onCancel,
}: TemplateFormProps) {
  const defaultLanguage =
    languages.find((l) => l.isDefault)?.code ?? languages[0]?.code ?? 'en'
  const [name, setName] = useState(initial?.name ?? '')
  const [language, setLanguage] = useState<LanguageCode>(
    initial?.language ?? defaultLanguage,
  )
  const [text, setText] = useState(initial?.text ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Offer languages that are turned on, plus the one this template already uses.
  const options = languages.filter((l) => l.enabled || l.code === initial?.language)

  const problems = findTemplateProblems(text)
  const preview = renderPreview(text)
  const sms = estimateSms(preview)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !text.trim()) {
      setError('Enter a name and the message text.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSubmit({ name: name.trim(), language, text: text.trim() })
      // On success the parent hides this form.
    } catch (err) {
      setError(messageFrom(err))
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm"
    >
      <h3 className="text-base font-bold text-white">
        {initial ? 'Edit template' : 'New template'}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tpl-name" className="text-xs text-slate-300">Name</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tpl-language" className="text-xs text-slate-300">Language</Label>
          <select
            id="tpl-language"
            className="h-9 w-full rounded-md border border-[#1b2e34] bg-[#0c1417] px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          >
            {options.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tpl-text">Message</Label>
        <Textarea
          id="tpl-text"
          rows={4}
          lang={language}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>Insert:</span>
          {PLACEHOLDERS.map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              title={PLACEHOLDER_HELP[p]}
              onClick={() => setText((t) => `${t}{${p}}`)}
            >
              {`{${p}}`}
            </Button>
          ))}
        </div>
        {problems.map((p) => (
          <p key={p} className="text-sm text-amber-800">
            {p}
          </p>
        ))}
      </div>

      <div className="space-y-1 rounded-lg border bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Preview with example values
        </p>
        <p lang={language} className="whitespace-pre-wrap text-sm text-slate-900">
          {preview || 'Nothing to preview yet.'}
        </p>
        <p className="text-xs text-slate-500">
          {sms.length} characters, about {sms.parts} SMS
          {sms.parts === 1 ? '' : ' messages'}
          {sms.unicode ? ' (this script needs Unicode, so about 70 characters per SMS)' : ''}.
          The real length depends on the area name and the action text.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={busy || problems.length > 0}>
          {busy ? 'Saving...' : initial ? 'Save template' : 'Create template'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}