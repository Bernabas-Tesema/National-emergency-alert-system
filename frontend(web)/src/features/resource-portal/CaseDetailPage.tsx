import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { fetchCase, sendCaseMessage } from '@/api/mockCases'
import MapAreaPicker from '@/components/MapAreaPicker'
import MessageThread from '@/components/MessageThread'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { SEVERITY_LABELS, type CaseRecord } from '@/types/case'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{children}</p>
    </div>
  )
}

function CaseDetail({ caseId }: { caseId: string }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [record, setRecord] = useState<CaseRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchCase(caseId).then((data) => {
      if (!cancelled) {
        setRecord(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [caseId])

  async function handleSend(text: string) {
    if (!user || !record) return
    const message = await sendCaseMessage(record.id, user, text)
    setRecord((prev) =>
      prev ? { ...prev, messages: [...prev.messages, message] } : prev,
    )
  }

  const backButton = (
    <Button variant="ghost" onClick={() => navigate('/resource/dashboard')}>
      ← Back to cases
    </Button>
  )

  if (loading) return <p className="text-slate-500">Loading case...</p>

  if (!record || !user) {
    return (
      <div className="space-y-4">
        {backButton}
        <p className="text-slate-700">Case not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {backButton}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{record.title}</h1>
        <StatusBadge status={record.status} />
      </div>

      <div className="grid gap-4 rounded-xl bg-white p-6 shadow sm:grid-cols-2">
        <Field label="Case ID">{record.id}</Field>
        <Field label="Category">{record.category}</Field>
        <Field label="Suggested severity">
          {record.severity ? SEVERITY_LABELS[record.severity] : 'Not set'}
        </Field>
        <Field label="Incident start time">
          {record.startTime
            ? new Date(record.startTime).toLocaleString()
            : 'Not set'}
        </Field>
        <Field label="Area">{record.area}</Field>
        <Field label="Last updated">{record.updatedAt}</Field>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Affected area</h2>
        <MapAreaPicker
          value={record.areaSelection}
          onChange={() => {}}
          readOnly
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-800">
          {record.description || 'No description.'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Recommended public action
        </h2>
        <p className="whitespace-pre-wrap text-sm text-slate-800">
          {record.recommendedAction || 'None given.'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Attachments</h2>
        {record.attachmentNames.length === 0 ? (
          <p className="text-sm text-slate-500">No attachments.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-slate-800">
            {record.attachmentNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Messages with INSA
        </h2>
        <MessageThread
          messages={record.messages}
          currentUserId={user.id}
          onSend={(text) => void handleSend(text)}
        />
      </section>
    </div>
  )
}

// The outer component reads the id from the address. Giving the inner one
// key={caseId} makes React start it fresh whenever the id changes, so we
// never show the previous case while the next one loads.
export default function CaseDetailPage() {
  const { caseId = '' } = useParams()
  return <CaseDetail key={caseId} caseId={caseId} />
}