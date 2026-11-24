import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Save, Send, ArrowLeft, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

import { saveCase, updateDraft } from '@/api/mockCases'
import { MapPicker, type GeoJsonFeature } from '@/packages/ui/MapPicker'
import { FileUploader, type UploadedFileItem } from '@/packages/ui/FileUploader'
import {
  CASE_CATEGORIES,
  CATEGORY_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  type CaseFormValues,
} from '@/types/case'

export const caseSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120, 'Title cannot exceed 120 characters'),
  category: z.string().min(1, 'Please select an incident category'),
  severity: z.string().min(1, 'Please select a valid severity level'),
  description: z.string().min(10, 'Please provide a detailed description (min 10 characters)'),
  recommendedAction: z.string().min(5, 'Please specify recommended public protective actions'),
  startTime: z.string().min(1, 'Start time is required'),
})

interface CaseFormProps {
  initialValues: CaseFormValues
  caseId?: string
  existingAttachments?: string[]
}

export default function CaseForm({
  initialValues,
  caseId,
  existingAttachments = [],
}: CaseFormProps) {
  const navigate = useNavigate()
  const [values, setValues] = useState<CaseFormValues>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | null>('saved')
  const [mapFeature, setMapFeature] = useState<GeoJsonFeature | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>(
    existingAttachments.map((name, i) => ({
      id: `att-${i}`,
      name,
      size: 1024 * 1024 * 1.5,
      type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      progress: 100,
      status: 'complete',
    })),
  )

  const backPath = caseId ? `/resource/cases/${caseId}` : '/resource/dashboard'

  function update<K extends keyof CaseFormValues>(key: K, value: CaseFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setAutosaveStatus('saving')
  }

  // Simulated Autosave for drafts
  useEffect(() => {
    if (autosaveStatus === 'saving') {
      const timer = setTimeout(() => {
        setAutosaveStatus('saved')
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [values, autosaveStatus])

  async function persist(status: 'draft' | 'submitted') {
    setErrors({})
    setFormError('')

    if (status === 'submitted') {
      const result = caseSchema.safeParse(values)
      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        result.error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
        return
      }
    } else {
      // Draft only requires a title
      if (!values.title.trim()) {
        setErrors({ title: 'A title is required to save a draft.' })
        return
      }
    }

    setBusy(true)
    try {
      if (caseId) {
        await updateDraft(caseId, values, status)
      } else {
        await saveCase(values, status)
      }
      navigate(backPath)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save the incident report. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void persist('submitted')
      }}
      className="max-w-4xl space-y-6"
    >
      {/* Header and Autosave Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b2e34] pb-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to cases</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {caseId ? 'Edit Incident Report' : 'Submit New Emergency Case'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {autosaveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Autosaving draft...</span>
            </span>
          )}
          {autosaveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Draft saved</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => void persist('draft')}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-[#1b2e34] bg-[#111d21] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#162327] transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save as Draft</span>
          </button>

          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors shadow-md disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit to INSA</span>
          </button>
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-950/60 border border-red-800 p-3 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="space-y-5 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-medium text-slate-300 mb-1.5">
            Incident Headline / Title *
          </label>
          <input
            id="title"
            type="text"
            value={values.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. Flash Flood Inundation in Awash River Basin"
            className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
          {errors.title && <p className="text-[11px] text-red-400 mt-1">{errors.title}</p>}
        </div>

        {/* Category & Suggested Severity */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-xs font-medium text-slate-300 mb-1.5">
              Incident Category *
            </label>
            <select
              id="category"
              value={values.category}
              onChange={(e) => update('category', e.target.value as any)}
              className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {CASE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-[11px] text-red-400 mt-1">{errors.category}</p>}
          </div>

          <div>
            <label htmlFor="severity" className="block text-xs font-medium text-slate-300 mb-1.5">
              Suggested Severity Level *
            </label>
            <select
              id="severity"
              value={values.severity}
              onChange={(e) => update('severity', e.target.value as any)}
              className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
            {errors.severity && (
              <p className="text-[11px] text-red-400 mt-1">{errors.severity}</p>
            )}
          </div>
        </div>

        {/* Start Time & Area Text */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="startTime" className="block text-xs font-medium text-slate-300 mb-1.5">
              Incident Occurrence Time *
            </label>
            <input
              id="startTime"
              type="datetime-local"
              value={values.startTime ? values.startTime.slice(0, 16) : ''}
              onChange={(e) => update('startTime', e.target.value)}
              className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            {errors.startTime && <p className="text-[11px] text-red-400 mt-1">{errors.startTime}</p>}
          </div>

          <div>
            <label htmlFor="area" className="block text-xs font-medium text-slate-300 mb-1.5">
              Target Area Description *
            </label>
            <input
              id="area"
              type="text"
              value={values.area?.regionId ?? ''}
              onChange={(e) => update('area', { ...(values.area || { points: [] }), regionId: e.target.value })}
              placeholder="e.g. Bole Sub-city, Woreda 03 or Awash Highway KM 45"
              className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
            {errors.area && <p className="text-[11px] text-red-400 mt-1">{errors.area}</p>}
          </div>
        </div>

        {/* Interactive Map Picker */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Geographic Boundary & Coordinate Targeting (MapPicker)
          </label>
          <MapPicker
            value={mapFeature}
            onChange={(feat) => {
              setMapFeature(feat)
              const ref = feat.properties.regionRef
              const areaName = `${ref.region}${ref.subcity ? ` - ${ref.subcity}` : ''}`
              update('area', {
                regionId: areaName,
                points: feat.geometry.type === 'Polygon' ? (feat.geometry.coordinates[0] as [number, number][]) : [],
              })
            }}
            height="320px"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-medium text-slate-300 mb-1.5">
            Detailed Incident Situation Description *
          </label>
          <textarea
            id="description"
            rows={4}
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Describe what occurred, impacted infrastructure, casualties, and on-ground status..."
            className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
          {errors.description && <p className="text-[11px] text-red-400 mt-1">{errors.description}</p>}
        </div>

        {/* Recommended Public Action */}
        <div>
          <label htmlFor="action" className="block text-xs font-medium text-slate-300 mb-1.5">
            Recommended Citizen / Public Protective Actions *
          </label>
          <textarea
            id="action"
            rows={3}
            value={values.recommendedAction}
            onChange={(e) => update('recommendedAction', e.target.value)}
            placeholder="e.g. Evacuate to designated higher ground. Avoid bridge crossings. Keep phone lines open."
            className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
          {errors.recommendedAction && (
            <p className="text-[11px] text-red-400 mt-1">{errors.recommendedAction}</p>
          )}
        </div>

        {/* Attachments with FileUploader */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Evidence Attachments (Photos, Sensor Telemetry, Damage Logs, Videos)
          </label>
          <FileUploader
            value={uploadedFiles}
            onChange={setUploadedFiles}
            maxSizeMb={25}
          />
        </div>
      </div>
    </form>
  )
}