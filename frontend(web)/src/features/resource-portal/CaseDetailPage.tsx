
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'

import {
  fetchCase,
  requestCaseUpdate,
  resubmitCase,
  sendCaseMessage,
} from '@/api/mockCases'
import DataTable, { type Column } from '@/components/DataTable'
import MapAreaPicker from '@/components/MapAreaPicker'
import MessageThread from '@/components/MessageThread'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { useRealtimeEvents } from '@/features/realtime/useRealtime'
import {
  CHANNEL_LABELS,
  SEVERITY_LABELS,
  UPDATE_KIND_LABELS,
  type CaseRecord,
  type CaseUpdateKind,
  type DeliveryChannelStats,
} from '@/types/case'
import CaseUpdateForm from './CaseUpdateForm'

const deliveryColumns: Column<DeliveryChannelStats>[] = [
  { header: 'Channel', cell: (d) => CHANNEL_LABELS[d.channel] },
  { header: 'Sent', cell: (d) => d.sent.toLocaleString() },
  { header: 'Delivered', cell: (d) => d.delivered.toLocaleString() },
  { header: 'Failed', cell: (d) => d.failed.toLocaleString() },
]

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900">{children}</p>
    </div>
  )
}

function CaseDetail({ caseId }: { caseId: string }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [record, setRecord] = useState<CaseRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

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

  // When this case changes or gets a message, reload it.
  useRealtimeEvents((event) => {
    if (
      (event.type === 'case_changed' || event.type === 'case_message') &&
      event.caseId === caseId
    ) {
      void fetchCase(caseId).then((data) => {
        if (data) setRecord(data)
      })
    }
  })

  async function handleSend(text: string) {
    if (!user || !record) return

    const message = await sendCaseMessage(record.id, user, text)

    setRecord((prev) =>
      prev ? { ...prev, messages: [...prev.messages, message] } : prev,
    )
  }

  async function handleResubmit() {
    if (!record) return

    setActionError('')
    setBusy(true)

    try {
      await resubmitCase(record.id)
      setRecord((prev) => (prev ? { ...prev, status: 'submitted' } : prev))
    } catch {
      setActionError('Could not resubmit the case. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Errors are left to the form, which shows its own message.
  async function handleUpdateRequest(kind: CaseUpdateKind, text: string) {
    if (!user || !record) return

    const update = await requestCaseUpdate(record.id, kind, text, user)

    setRecord((prev) =>
      prev ? { ...prev, updates: [...prev.updates, update] } : prev,
    )
  }

  const backButton = (
    <Button
      variant="ghost"
      onClick={() => navigate('/resource/dashboard')}
    >
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
        <h1 className="text-2xl font-bold text-slate-900">
          {record.title}
        </h1>
        <StatusBadge status={record.status} />
      </div>

      {record.status === 'draft' && (
        <Button
          onClick={() => navigate(`/resource/cases/${record.id}/edit`)}
        >
          Edit draft
        </Button>
      )}

      {record.status === 'needs_clarification' && (
        <div className="space-y-2 rounded-xl border border-orange-300 bg-orange-50 p-4">
          <p className="text-sm text-orange-900">
            INSA needs more information. Answer in the messages below, then
            send the case back for review.
          </p>

          <Button onClick={() => void handleResubmit()} disabled={busy}>
            {busy ? 'Sending...' : 'Resubmit to INSA'}
          </Button>

          {actionError && (
            <p className="text-sm text-red-600">{actionError}</p>
          )}
        </div>
      )}

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
        <h2 className="text-lg font-semibold text-slate-900">
          Affected area
        </h2>

        <MapAreaPicker
          value={record.areaSelection}
          onChange={() => {}}
          readOnly
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Description
        </h2>
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
        <h2 className="text-lg font-semibold text-slate-900">
          Attachments
        </h2>

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

      {record.decision && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            INSA decision
          </h2>

          <div className="space-y-2 rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-slate-800">
              <span
                className={
                  record.decision.outcome === 'approved'
                    ? 'font-semibold text-green-700'
                    : 'font-semibold text-red-700'
                }
              >
                {record.decision.outcome === 'approved'
                  ? 'Approved'
                  : 'Rejected'}
              </span>{' '}
              by {record.decision.decidedBy} on{' '}
              {new Date(record.decision.decidedAt).toLocaleString()}
            </p>

            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {record.decision.comment}
            </p>
          </div>
        </section>
      )}

      {record.delivery && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Delivery summary
          </h2>

          <DataTable
            columns={deliveryColumns}
            rows={record.delivery}
            getRowId={(d) => d.channel}
          />
        </section>
      )}

      {(record.status === 'broadcast' || record.updates.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Updates and all clear
          </h2>

          {record.status === 'broadcast' && (
            <>
              <p className="text-sm text-slate-600">
                These are requests to INSA. Nothing is sent to the public
                until INSA approves it.
              </p>
              <CaseUpdateForm onSubmit={handleUpdateRequest} />
            </>
          )}

          {record.updates.length > 0 && (
            <ul className="divide-y rounded-lg border bg-white">
              {record.updates.map((u) => (
                <li key={u.id} className="space-y-1 px-4 py-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {UPDATE_KIND_LABELS[u.kind]} requested by {u.requestedBy}
                  </p>

                  <p className="whitespace-pre-wrap text-slate-700">
                    {u.text}
                  </p>

                  <p className="text-xs text-slate-500">
                    {new Date(u.requestedAt).toLocaleString()} · Awaiting
                    INSA review
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
// key={caseId} makes React start it fresh whenever the id changes.
export default function CaseDetailPage() {
  const { caseId = '' } = useParams()

  return <CaseDetail key={caseId} caseId={caseId} />
}
