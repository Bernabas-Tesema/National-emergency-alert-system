import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { saveCase, updateDraft } from '@/api/mockCases'
import FileUploader from '@/components/FileUploader'
import MapAreaPicker from '@/components/MapAreaPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  validateDraft,
  validateSubmission,
  type FormErrors,
} from '@/lib/caseValidation'
import {
  CASE_CATEGORIES,
  CATEGORY_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  type CaseFormValues,
} from '@/types/case'

const selectClass = 'h-9 w-full rounded-md border bg-white px-3 text-sm'

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-600">{message}</p> : null
}

interface CaseFormProps {
  initialValues: CaseFormValues
  caseId?: string // present when editing an existing draft
  existingAttachments?: string[]
}

export default function CaseForm({
  initialValues,
  caseId,
  existingAttachments = [],
}: CaseFormProps) {
  const navigate = useNavigate()
  const [values, setValues] = useState<CaseFormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const backPath = caseId ? `/resource/cases/${caseId}` : '/resource/dashboard'

  // Changes one field and leaves the others as they are.
  function update<K extends keyof CaseFormValues>(
    key: K,
    value: CaseFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function persist(status: 'draft' | 'submitted') {
    const found =
      status === 'draft' ? validateDraft(values) : validateSubmission(values)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      if (caseId) {
        await updateDraft(caseId, values, status)
      } else {
        await saveCase(values, status)
      }
      navigate(backPath)
    } catch {
      setFormError('Could not save the case. Please try again.')
      setBusy(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void persist('submitted')
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">
        {caseId ? 'Edit draft' : 'New case'}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
        />
        <FieldError message={errors.title} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className={selectClass}
            value={values.category}
            onChange={(e) =>
              update('category', e.target.value as CaseFormValues['category'])
            }
          >
            <option value="">Select a category</option>
            {CASE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <FieldError message={errors.category} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity">Suggested severity</Label>
          <select
            id="severity"
            className={selectClass}
            value={values.severity}
            onChange={(e) =>
              update('severity', e.target.value as CaseFormValues['severity'])
            }
          >
            <option value="">Select a severity</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
          <FieldError message={errors.severity} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Affected area</Label>
        <MapAreaPicker
          value={values.area}
          onChange={(area) => update('area', area)}
        />
        <FieldError message={errors.area} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startTime">Incident start time</Label>
        <Input
          id="startTime"
          type="datetime-local"
          value={values.startTime}
          onChange={(e) => update('startTime', e.target.value)}
        />
        <FieldError message={errors.startTime} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={5}
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
        />
        <FieldError message={errors.description} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recommendedAction">
          Recommended public action (optional)
        </Label>
        <Textarea
          id="recommendedAction"
          rows={3}
          value={values.recommendedAction}
          onChange={(e) => update('recommendedAction', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Attachments (optional)</Label>
        {existingAttachments.length > 0 && (
          <div className="text-sm text-slate-700">
            <p>Already attached:</p>
            <ul className="list-disc pl-5">
              {existingAttachments.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}
        <FileUploader
          files={values.files}
          onChange={(files) => update('files', files)}
        />
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Submit to INSA'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void persist('draft')}
        >
          Save as draft
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => navigate(backPath)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}